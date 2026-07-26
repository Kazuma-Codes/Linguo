import httpx, json, logging
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_cultural_context(original: str, translated: str, target: str) -> dict:
    """Analyze cultural nuances using the primary model (Qwen).
    
    Uses the same model as translation so it stays loaded in VRAM
    permanently — no swapping, no lag.
    """
    prompt = f"""You are a cultural intelligence expert. Analyze:
Original: {original}
Translated ({target}): {translated}
Return ONLY JSON: {{"humor_explanation": "string|null", "idiom_breakdown": "string|null", "etiquette_warning": "string|null"}}"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                },
            )
            if res.status_code == 200:
                raw = res.json().get("response", "{}")
                return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Qwen returned invalid JSON for cultural context")
    except Exception as e:
        logger.error(f"Cultural analysis failed ({settings.OLLAMA_MODEL}): {e}")
    return {}