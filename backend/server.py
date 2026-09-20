from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import ipaddress
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from html import escape
from html.parser import HTMLParser
from typing import Optional
from urllib.parse import urlparse

import bcrypt
import httpx
import jwt
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
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
    keys = ("user_id", "name", "email", "picture", "role", "auth_provider")
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
    await seed_admin()


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
