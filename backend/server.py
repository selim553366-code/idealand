from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import base64
import ipaddress
import json
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from html import escape
from html.parser import HTMLParser
from typing import Optional
from urllib.parse import urlparse

import bcrypt
import httpx
import jwt
from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ["FRONTEND_URL"]

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


# ---------- Models ----------
class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class WaitlistCreate(BaseModel):
    email: str
    use_case: Optional[str] = None
    prompt: Optional[str] = None


class WaitlistEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    use_case: Optional[str] = None
    prompt: Optional[str] = None
    queue_number: int
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str, email: str):
    response.set_cookie("access_token", create_access_token(user_id, email),
                        httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user_id),
                        httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def public_user(doc: dict) -> dict:
    keys = ("user_id", "name", "email", "picture", "role", "auth_provider", "tour_seen")
    return {k: doc[k] for k in keys if doc.get(k) is not None}


async def user_from_jwt(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
    except jwt.PyJWTError:
        return None
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    return user


async def user_from_session(session_token: str) -> dict:
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if token:
        user = await user_from_jwt(token)
        if user:
            return user
    session_token = request.cookies.get("session_token")
    if session_token:
        return await user_from_session(session_token)
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        raw = auth[7:]
        user = await user_from_jwt(raw)
        if user:
            return user
        return await user_from_session(raw)
    raise HTTPException(status_code=401, detail="Not authenticated")


async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("locked_until"):
        until = rec["locked_until"]
        if isinstance(until, str):
            until = datetime.fromisoformat(until)
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        if until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")


async def record_failure(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"identifier": identifier, "count": count}
    if count >= 5:
        update = {"identifier": identifier, "count": 0,
                  "locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


# ---------- Email (Resend managed) ----------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: Optional[str] = None) -> Optional[str]:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()
    return resp.json().get("id")


def welcome_email_html(name: str) -> str:
    safe_name = escape(name)
    app_url = FRONTEND_URL
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#E0F2FE;padding:36px 16px;"><tr><td align="center">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" '
        'style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(14,165,233,0.18);">'
        '<tr><td style="background:linear-gradient(135deg,#38BDF8,#0284C7);padding:34px 40px;">'
        '<div style="font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#ffffff;">idealand.ai</div>'
        '<div style="font-family:Arial,sans-serif;font-size:13px;color:#E0F2FE;margin-top:6px;">Where ideas become living products</div>'
        '</td></tr>'
        f'<tr><td style="padding:36px 40px;font-family:Arial,sans-serif;color:#0F172A;">'
        f'<h1 style="font-size:22px;margin:0 0 12px;">Welcome aboard, {safe_name}</h1>'
        '<p style="font-size:15px;line-height:1.65;color:#475569;margin:0 0 8px;">'
        'Your seat in idealand is ready. Describe any idea in plain words and watch it turn '
        'into a live website or app — glassy gradients and tactile buttons included.</p>'
        '<p style="font-size:15px;line-height:1.65;color:#475569;margin:0 0 24px;">'
        'No code. No waiting. Just your idea, alive in seconds.</p>'
        '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
        '<td style="background:#0284C7;border-radius:14px;">'
        f'<a href="{app_url}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;'
        'font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Start creating now</a>'
        '</td></tr></table>'
        '<p style="font-size:12px;color:#94A3B8;margin:30px 0 0;">'
        f'Sent by {escape(EMAIL_FROM_NAME)}. We never ask for your password by email.</p>'
        '</td></tr></table></td></tr></table>'
    )


async def send_welcome_email(user: dict):
    try:
        await send_email(
            to=user["email"],
            subject="Welcome to idealand.ai — your ideas are about to get real",
            html=welcome_email_html(user.get("name") or "there"),
        )
        logger.info(f"Welcome email sent to {user['email']}")
    except Exception as e:
        logger.error(f"Welcome email failed for {user.get('email')}: {e}")


# ---------- Auth routes ----------
@api_router.post("/auth/register")
async def register(input: RegisterIn, response: Response):
    name = input.name.strip()
    email = input.email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Please tell us your name")
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    if len(input.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = await db.users.find_one({"email": email})
    if existing:
        if existing.get("auth_provider") == "google" and not existing.get("password_hash"):
            raise HTTPException(status_code=400, detail="This email uses Google sign-in. Continue with Google.")
        raise HTTPException(status_code=400, detail="This email is already registered. Sign in instead.")

    user = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "name": name,
        "email": email,
        "password_hash": hash_password(input.password),
        "role": "user",
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user)
    set_auth_cookies(response, user["user_id"], email)
    asyncio.create_task(send_welcome_email(user))
    return public_user(user)


@api_router.post("/auth/login")
async def login(input: LoginIn, request: Request, response: Response):
    email = input.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await check_lockout(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        await record_failure(identifier)
        if user and user.get("auth_provider") == "google":
            raise HTTPException(status_code=400, detail="This account uses Google sign-in. Continue with Google.")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(input.password, user["password_hash"]):
        await record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, user["user_id"], email)
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"status": "ok"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]),
                        httponly=True, secure=True, samesite="none", max_age=900, path="/")
    return {"status": "ok"}


@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session id")
    async with httpx.AsyncClient(timeout=20) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed")
    data = r.json()
    email = data["email"].strip().lower()

    user = await db.users.find_one({"email": email})
    is_new = user is None
    if is_new:
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "name": data.get("name") or email.split("@")[0],
            "email": email,
            "picture": data.get("picture"),
            "role": "user",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(dict(user))
    else:
        await db.users.update_one(
            {"email": email},
            {"$set": {"picture": data.get("picture"), "name": data.get("name") or user.get("name")}},
        )

    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": data["session_token"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie("session_token", data["session_token"],
                        httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    if is_new:
        asyncio.create_task(send_welcome_email(user))
    return public_user(user)


# ---------- Password reset ----------
class ForgotIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    token: str
    password: str


def reset_email_html(name: str, link: str) -> str:
    safe_name = escape(name)
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#E0F2FE;padding:36px 16px;"><tr><td align="center">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" '
        'style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(14,165,233,0.18);">'
        '<tr><td style="background:linear-gradient(135deg,#38BDF8,#0284C7);padding:34px 40px;">'
        '<div style="font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#ffffff;">idealand.ai</div>'
        '<div style="font-family:Arial,sans-serif;font-size:13px;color:#E0F2FE;margin-top:6px;">Where ideas become living products</div>'
        '</td></tr>'
        f'<tr><td style="padding:36px 40px;font-family:Arial,sans-serif;color:#0F172A;">'
        f'<h1 style="font-size:22px;margin:0 0 12px;">Reset your password</h1>'
        f'<p style="font-size:15px;line-height:1.65;color:#475569;margin:0 0 24px;">'
        f'Hi {safe_name}, we received a request to reset the password for your idealand.ai account. '
        'This link expires in 1 hour. If you did not request it, you can ignore this email.</p>'
        '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
        '<td style="background:#0284C7;border-radius:14px;">'
        f'<a href="{link}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;'
        'font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Choose a new password</a>'
        '</td></tr></table>'
        '<p style="font-size:12px;color:#94A3B8;margin:30px 0 0;">'
        f'Sent by {escape(EMAIL_FROM_NAME)}. We never ask for your password by email.</p>'
        '</td></tr></table></td></tr></table>'
    )


@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotIn):
    email = input.email.strip().lower()
    if EMAIL_RE.match(email):
        user = await db.users.find_one({"email": email})
        if user:
            token = secrets.token_urlsafe(32)
            await db.password_reset_tokens.insert_one({
                "token": token,
                "email": email,
                "used": False,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
                "created_at": datetime.now(timezone.utc),
            })
            link = f"{FRONTEND_URL}/reset-password?token={token}"
            try:
                await send_email(
                    to=email,
                    subject="Reset your idealand.ai password",
                    html=reset_email_html(user.get("name") or "there", link),
                )
            except Exception as e:
                logger.error(f"Reset email failed for {email}: {e}")
    return {"status": "ok"}


@api_router.post("/auth/reset-password")
async def reset_password(input: ResetIn):
    if len(input.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    rec = await db.password_reset_tokens.find_one({"token": input.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="This reset link is invalid or already used")
    expires = rec["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link has expired")
    await db.users.update_one({"email": rec["email"]},
                              {"$set": {"password_hash": hash_password(input.password)}})
    await db.password_reset_tokens.update_one({"token": input.token}, {"$set": {"used": True}})
    return {"status": "ok"}


@api_router.post("/auth/tour-seen")
async def tour_seen(user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"tour_seen": True}})
    return {"status": "ok"}


# ---------- AI generation ----------
GENERATOR_SYSTEM = (
    "You are idealand.ai's product generator. Given a user's idea, you create a complete, visually "
    "stunning, self-contained single-file HTML website or app prototype. Rules: the first line must be "
    "exactly 'TITLE: <2-4 word product name>', then a blank line, then the raw HTML document starting "
    "with <!DOCTYPE html>. No markdown code fences, no explanations. All CSS and JS must be inline in "
    "the single file. Google Fonts via CDN link tags are allowed. Use modern responsive design with "
    "smooth animations and realistic sample content (no lorem ipsum). Never reference local files."
)


EDITOR_SYSTEM = (
    "You are idealand.ai's product editor. You receive an existing single-file HTML website and a "
    "change request. Return the COMPLETE updated HTML file with the change applied, keeping everything "
    "else intact. First line exactly 'TITLE: <same or improved 2-4 word name>', then a blank line, then "
    "the raw HTML starting with <!DOCTYPE html>. No markdown code fences, no explanations."
)

QUESTION_SYSTEM = (
    "You are idealand.ai's product strategist. Given a user's rough idea for a website or app, ask exactly "
    "2 short clarifying questions that would most improve the result. Output ONLY a JSON array, no markdown "
    'fences: [{"q": "question text", "options": ["opt1", "opt2", "opt3"]}]. Keep each option under 5 words.'
)


class GenerateIn(BaseModel):
    prompt: str
    gen_id: Optional[str] = None
    context: Optional[str] = None
    project_type: Optional[str] = None
    upload_ids: Optional[list] = None


class RevertIn(BaseModel):
    version: int


def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def parse_generation(raw: str):
    text = raw.strip()
    title = "Untitled Creation"
    if text.startswith("TITLE:"):
        first, _, rest = text.partition("\n")
        title = first.replace("TITLE:", "").strip() or title
        text = rest.strip()
    text = re.sub(r"^```(?:html)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text)
    idx = text.lower().find("<!doctype")
    if idx > 0:
        text = text[idx:]
    if "<html" not in text.lower():
        return title, None
    return title, text


DISCUSS_SYSTEM = (
    "You are the orchestrator of idealand.ai's expert bot team. Given a product idea, write a short team "
    "discussion (4-6 messages) between these bots: brand (Brand Bot: naming, look and feel), customer "
    "(Customer Insight Bot: what the target audience needs), marketing (Ad Marketing Bot: 1-2 concrete ad "
    "angles), finance (Financial Bot: one pricing or budget note), developer (Developer Bot: technical "
    "approach). They talk TO each other, referencing each other's points, max 25 words per message, in "
    "English. If a video ad makes sense, marketing proposes it and video (Ad Video Bot) replies that it "
    "will wait for the user's approval before creating anything. Output ONLY JSON, no markdown: "
    '{"messages":[{"bot":"brand|customer|marketing|finance|developer|video","text":"..."}],'
    '"summary":"1-2 sentence build plan","video_proposed":true}'
)

VIDEO_SYSTEM = (
    "You are idealand.ai's Ad Video Generator Bot. Given a product and plan, create a punchy 15-second "
    "video ad storyboard. Output ONLY JSON, no markdown: "
    '{"title":"ad title","scenes":[{"seconds":"0-3","visual":"what we see","line":"voiceover or caption"}'
    ' (4-5 scenes)],"cta":"closing call to action"}'
)


@api_router.post("/agent/discuss")
async def agent_discuss(input: GenerateIn, user: dict = Depends(get_current_user)):
    prompt = input.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Describe your idea first")

    async def events():
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"d_{uuid.uuid4().hex[:10]}",
            system_message=DISCUSS_SYSTEM,
        ).with_model("openai", "gpt-5.4-mini")
        chunks = []
        try:
            async for ev in chat.stream_message(
                UserMessage(text=f"Product idea ({input.project_type or 'website'}): {prompt}")
            ):
                if isinstance(ev, TextDelta):
                    chunks.append(ev.content)
                elif isinstance(ev, StreamDone):
                    break
            match = re.search(r"\{.*\}", "".join(chunks), re.S)
            parsed = json.loads(match.group(0)) if match else {}
            valid = {"brand", "customer", "marketing", "finance", "developer", "video"}
            messages = [
                {"bot": m["bot"], "text": str(m["text"])[:280]}
                for m in parsed.get("messages", [])
                if isinstance(m, dict) and m.get("bot") in valid and m.get("text")
            ][:8]
            for m in messages:
                await asyncio.sleep(0.55)
                yield sse({"type": "bot", "bot": m["bot"], "text": m["text"]})
            await asyncio.sleep(0.4)
            yield sse({
                "type": "plan",
                "summary": str(parsed.get("summary", ""))[:500],
                "video_proposed": bool(parsed.get("video_proposed")),
            })
        except Exception as e:
            logger.error(f"Discussion failed: {e}")
            yield sse({"type": "error", "detail": "Team discussion failed"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.post("/agent/video")
async def agent_video(input: GenerateIn, user: dict = Depends(get_current_user)):
    prompt = input.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing context for the video ad")
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"v_{uuid.uuid4().hex[:10]}",
        system_message=VIDEO_SYSTEM,
    ).with_model("openai", "gpt-5.4-mini")
    chunks = []
    try:
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                chunks.append(ev.content)
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.error(f"Video storyboard failed: {e}")
        raise HTTPException(status_code=502, detail="Video bot failed. Try again.")
    match = re.search(r"\{.*\}", "".join(chunks), re.S)
    try:
        storyboard = json.loads(match.group(0)) if match else {}
    except json.JSONDecodeError:
        storyboard = {}
    if not storyboard.get("scenes"):
        storyboard = {"title": "Video Ad", "scenes": [], "cta": "Learn more"}
    return storyboard


@api_router.post("/uploads")
async def upload_file(request: Request, user: dict = Depends(get_current_user)):
    form = await request.form()
    file = form.get("file")
    if file is None:
        raise HTTPException(status_code=400, detail="No file attached")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")
    upload_id = f"up_{uuid.uuid4().hex[:12]}"
    await db.uploads.insert_one({
        "upload_id": upload_id,
        "user_id": user["user_id"],
        "filename": file.filename or "file",
        "content_type": file.content_type or "application/octet-stream",
        "data_b64": base64.b64encode(data).decode(),
        "created_at": datetime.now(timezone.utc),
    })
    return {"upload_id": upload_id, "filename": file.filename or "file",
            "content_type": file.content_type or "application/octet-stream"}


@api_router.post("/generate")
async def generate(input: GenerateIn, user: dict = Depends(get_current_user)):
    prompt = input.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Describe your idea first")
    gen_id = input.gen_id or f"gen_{uuid.uuid4().hex[:12]}"
    existing = None
    if input.gen_id:
        existing = await db.generations.find_one(
            {"gen_id": input.gen_id, "user_id": user["user_id"]})
        if not existing:
            raise HTTPException(status_code=404, detail="Generation not found")

    async def events():
        yield sse({"type": "status", "step": "analyzing"})
        extras = []
        if input.project_type == "app":
            extras.append(
                "Output format: a MOBILE APP interface rendered inside a centered 390px-wide phone "
                "frame (rounded 40px corners, soft shadow) on a light backdrop."
            )
        else:
            extras.append("Output format: a full-width responsive WEBSITE.")
        if input.upload_ids:
            uploads = await db.uploads.find(
                {"upload_id": {"$in": input.upload_ids}, "user_id": user["user_id"]}).to_list(5)
            for up in uploads:
                name = up["filename"]
                if up["content_type"].startswith("text/") or name.endswith((".txt", ".md", ".csv")):
                    content = base64.b64decode(up["data_b64"]).decode("utf-8", "ignore")[:1500]
                    extras.append(f'Attached file "{name}" content:\n{content}')
                else:
                    extras.append(
                        f'Attached file "{name}" ({up["content_type"]}) — use it as design/context reference.'
                    )
        if existing:
            system = EDITOR_SYSTEM
            message_text = f"CURRENT HTML:\n{existing['html']}\n\nCHANGE REQUEST: {prompt}"
            if extras:
                message_text += "\n\n" + "\n".join(extras)
        else:
            system = GENERATOR_SYSTEM
            message_text = prompt
            if input.context:
                message_text += f"\n\nTeam plan and client preferences:\n{input.context}"
            if extras:
                message_text += "\n\n" + "\n".join(extras)
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=gen_id,
            system_message=system,
        ).with_model("openai", "gpt-5.4")
        chunks, total, stage = [], 0, 0
        thresholds = [(600, "designing"), (2500, "coding"), (8000, "polishing")]
        try:
            async for ev in chat.stream_message(UserMessage(text=message_text)):
                if isinstance(ev, TextDelta):
                    chunks.append(ev.content)
                    total += len(ev.content)
                    while stage < len(thresholds) and total > thresholds[stage][0]:
                        yield sse({"type": "status", "step": thresholds[stage][1]})
                        stage += 1
                elif isinstance(ev, StreamDone):
                    break
            title, html = parse_generation("".join(chunks))
            if not html:
                raise ValueError("empty generation")
            now = datetime.now(timezone.utc)
            if existing:
                versions = existing.get("versions") or [{
                    "html": existing["html"],
                    "title": existing["title"],
                    "note": "Initial build",
                    "created_at": existing["created_at"],
                }]
                versions.append({"html": html, "title": title, "note": prompt[:60], "created_at": now})
                await db.generations.update_one(
                    {"gen_id": gen_id},
                    {
                        "$set": {"html": html, "title": title, "versions": versions,
                                 "current_version": len(versions) - 1},
                        "$push": {"messages": {"$each": [
                            {"role": "user", "text": prompt, "created_at": now},
                            {"role": "agent", "text": f"Updated “{title}” — your change is live.", "created_at": now},
                        ]}},
                    },
                )
            else:
                await db.generations.insert_one({
                    "gen_id": gen_id,
                    "user_id": user["user_id"],
                    "prompt": prompt,
                    "title": title,
                    "html": html,
                    "project_type": input.project_type or "website",
                    "versions": [{"html": html, "title": title, "note": "Initial build", "created_at": now}],
                    "current_version": 0,
                    "messages": [
                        {"role": "user", "text": prompt, "created_at": now},
                        {"role": "agent", "text": f"Created “{title}” — it's live in the preview.", "created_at": now},
                    ],
                    "created_at": now,
                })
            yield sse({"type": "done", "gen_id": gen_id, "title": title})
        except Exception as e:
            logger.error(f"Generation failed for {user['user_id']}: {e}")
            yield sse({"type": "error", "detail": "Generation failed. Please try again."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/generations")
async def list_generations(user: dict = Depends(get_current_user)):
    docs = await db.generations.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "html": 0},
    ).sort("created_at", -1).to_list(30)
    return docs


@api_router.get("/generations/{gen_id}")
async def get_generation(gen_id: str, user: dict = Depends(get_current_user)):
    doc = await db.generations.find_one(
        {"gen_id": gen_id, "user_id": user["user_id"]}, {"_id": 0, "html": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Generation not found")
    versions = doc.pop("versions", []) or []
    doc["versions"] = [
        {"index": i, "title": v.get("title"), "note": v.get("note"), "created_at": v.get("created_at")}
        for i, v in enumerate(versions)
    ]
    doc["current_version"] = doc.get("current_version", len(versions) - 1 if versions else 0)
    return doc


@api_router.get("/generations/{gen_id}/html")
async def get_generation_html(gen_id: str, user: dict = Depends(get_current_user)):
    doc = await db.generations.find_one(
        {"gen_id": gen_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Generation not found")
    versions = doc.get("versions") or []
    if versions:
        idx = doc.get("current_version", len(versions) - 1)
        idx = max(0, min(idx, len(versions) - 1))
        return HTMLResponse(versions[idx]["html"])
    return HTMLResponse(doc["html"])


@api_router.post("/generations/{gen_id}/revert")
async def revert_generation(gen_id: str, input: RevertIn, user: dict = Depends(get_current_user)):
    doc = await db.generations.find_one(
        {"gen_id": gen_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Generation not found")
    versions = doc.get("versions") or []
    if input.version < 0 or input.version >= len(versions):
        raise HTTPException(status_code=400, detail="Unknown version")
    target = versions[input.version]
    await db.generations.update_one(
        {"gen_id": gen_id},
        {"$set": {"current_version": input.version, "html": target["html"], "title": target["title"]}},
    )
    return {"status": "ok", "version": input.version, "title": target["title"]}


# ---------- Waitlist ----------
@api_router.get("/")
async def root():
    return {"message": "idealand.ai API", "status": "ok"}


@api_router.post("/waitlist")
async def join_waitlist(input: WaitlistCreate):
    email = input.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    existing = await db.waitlist.find_one({"email": email}, {"_id": 0})
    if existing:
        return {"status": "already_registered", "email": email, "queue_number": existing["queue_number"]}

    count = await db.waitlist.count_documents({})
    entry = WaitlistEntry(email=email, use_case=input.use_case, prompt=input.prompt, queue_number=count + 1)
    await db.waitlist.insert_one(entry.model_dump())
    return {"status": "registered", "email": email, "queue_number": entry.queue_number}


@api_router.get("/waitlist/count")
async def waitlist_count():
    return {"count": await db.waitlist.count_documents({})}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "auth_provider": "password",
            "created_at": datetime.now(timezone.utc),
        })
    elif existing.get("password_hash") and not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.login_attempts.create_index("identifier")
    await db.generations.create_index([("user_id", 1), ("created_at", -1)])
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await seed_admin()


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
