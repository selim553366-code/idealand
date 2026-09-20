from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


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
        return {
            "status": "already_registered",
            "email": email,
            "queue_number": existing["queue_number"],
        }

    count = await db.waitlist.count_documents({})
    entry = WaitlistEntry(
        email=email,
        use_case=input.use_case,
        prompt=input.prompt,
        queue_number=count + 1,
    )
    await db.waitlist.insert_one(entry.model_dump())
    return {
        "status": "registered",
        "email": email,
        "queue_number": entry.queue_number,
    }


@api_router.get("/waitlist/count")
async def waitlist_count():
    count = await db.waitlist.count_documents({})
    return {"count": count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
