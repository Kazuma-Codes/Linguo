"""Cultural context analysis using the local Ollama LLM.

When a message is translated, this module generates cultural footnotes that
explain humor, idioms, and etiquette differences between the source and
target languages. Uses the same model as translation (Qwen) to avoid
GPU memory swapping overhead.
"""

import json
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Default fallback returned when the LLM call fails — prevents null-footnote crashes.
EMPTY_CONTEXT = {"humor_explanation": None, "idiom_breakdown": None, "etiquette_warning": None}


async def get_cultural_context(original: str, translated: str, target: str) -> dict:
    """Analyze cultural nuances of a translated message using the LLM.

    Args:
        original: The original text before translation.
        translated: The translated text.
        target: The target language code (e.g. 'es', 'ja').

    Returns:
        A dict with keys: humor_explanation, idiom_breakdown, etiquette_warning.
        Values are strings or None. Returns EMPTY_CONTEXT on failure.
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
            res.raise_for_status()
            raw = res.json().get("response", "{}")
            return json.loads(raw)

    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama returned {e.response.status_code} for cultural context: {e.response.text}")
    except httpx.RequestError as e:
        logger.error(f"Could not reach Ollama for cultural context ({settings.OLLAMA_MODEL}): {e}")
    except json.JSONDecodeError:
        logger.warning("Qwen returned invalid JSON for cultural context")
    except Exception as e:
        logger.error(f"Cultural analysis failed ({settings.OLLAMA_MODEL}): {e}")

    return EMPTY_CONTEXT.copy()