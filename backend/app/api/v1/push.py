import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pywebpush import webpush, WebPushException
import json, httpx

router = APIRouter()

class PushSub(BaseModel):
    endpoint: str
    keys: dict

@router.post("/web")
async def web_push(sub: PushSub, message: str):
    vapid_key = os.environ.get("VAPID_PRIVATE_KEY")
    if not vapid_key:
        raise HTTPException(status_code=503, detail="Push notifications not configured (VAPID_PRIVATE_KEY not set)")
    try:
        webpush(
            {"endpoint": sub.endpoint, "keys": sub.keys},
            json.dumps({"title": "Live Call", "body": message}),
            vapid_private_key=vapid_key,
            vapid_claims={"sub": "mailto:a@b.com"}
        )
        return {"status": "sent"}
    except Exception as e: return {"error": str(e)}

@router.post("/expo")
async def expo_push(token: str, message: str):
    async with httpx.AsyncClient() as c:
        return (await c.post("https://exp.host/--/api/v2/push/send", json={"to": token, "body": message})).json()