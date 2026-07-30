"""Push notification endpoints — Web Push and Expo Push.

Endpoints:
- POST /web: Send a Web Push notification to a browser subscription.
- POST /expo: Send an Expo Push notification to a mobile device.

Note: This is an optional router — only loaded if pywebpush is installed.
"""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pywebpush import webpush, WebPushException
import json
import httpx

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────────────────────

class PushSubscription(BaseModel):
    """Web Push subscription info from the browser's pushManager."""
    endpoint: str
    keys: dict


class WebPushRequest(BaseModel):
    """Combined request body for sending a Web Push notification."""
    subscription: PushSubscription
    message: str


class ExpoPushRequest(BaseModel):
    """Request body for sending an Expo Push notification."""
    token: str
    message: str


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/web")
async def web_push(req: WebPushRequest):
    """Send a Web Push notification to a browser subscription.

    Requires the VAPID_PRIVATE_KEY environment variable to be set.
    Returns an error with status 503 if push notifications are not configured.
    """
    vapid_key = os.environ.get("VAPID_PRIVATE_KEY")
    if not vapid_key:
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured (VAPID_PRIVATE_KEY not set)",
        )
    try:
        webpush(
            {"endpoint": req.subscription.endpoint, "keys": req.subscription.keys},
            json.dumps({"title": "Live Call", "body": req.message}),
            vapid_private_key=vapid_key,
            vapid_claims={"sub": "mailto:a@b.com"},
        )
        return {"status": "sent"}
    except WebPushException as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}


@router.post("/expo")
async def expo_push(req: ExpoPushRequest):
    """Send an Expo Push notification to a mobile device.

    Delegates to the Expo Push Notification Service API.
    """
    async with httpx.AsyncClient() as c:
        return (
            await c.post(
                "https://exp.host/--/api/v2/push/send",
                json={"to": req.token, "body": req.message},
            )
        ).json()
