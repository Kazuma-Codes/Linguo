import asyncio
import concurrent.futures
import json
import logging
from functools import lru_cache

import httpx
from ftlangdetect import detect

from app.core.config import settings

logger = logging.getLogger(__name__)

# Reused across calls instead of spinning up a new pool per sync translation.
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

_MAX_RETRIES = 2  # total attempts = 1 initial + 1 retry


def detect_language(text: str) -> str:
    """Detect the language of `text`. Falls back to 'en' if detection fails."""
    try:
        # fastText chokes on empty/whitespace-only or newline-containing input.
        cleaned = text.strip().replace("\n", " ")
        if not cleaned:
            return "en"
        return detect(cleaned)["lang"]
    except Exception as e:
        logger.warning(f"Language detection failed, defaulting to 'en': {e}")
        return "en"


async def _unload_model(model: str) -> None:
    """Tell Ollama to immediately unload a model from VRAM (best-effort)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": "", "keep_alive": 0},
            )
    except Exception:
        pass  # If this fails, Ollama will auto-swap anyway


async def translate_text_async(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text using Qwen (primary model).

    Uses JSON-constrained output so the model can't wrap the answer in
    commentary or quotes ("Sure, here's the translation: ..."), which
    plain-text prompting is prone to.

    After translating, the model stays loaded (keep_alive=5m default)
    so back-to-back translations are fast. It gets auto-evicted by
    Ollama when another model needs VRAM.
    """
    if source_lang == target_lang:
        return text

    prompt = (
        f"Translate the following text from {source_lang} to {target_lang}.\n"
        f'Return ONLY JSON: {{"translation": "string"}}\n\n'
        f"Text: {text}"
    )

    last_error: Exception | None = None
    for attempt in range(1, _MAX_RETRIES + 1):
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
                parsed = json.loads(raw)
                translation = parsed.get("translation")
                if translation:
                    return translation.strip()
                # Model returned valid JSON but no usable translation — treat as a failure and retry.
                raise ValueError(f"Empty translation in model response: {raw!r}")

        except (httpx.HTTPStatusError, httpx.RequestError, json.JSONDecodeError, ValueError) as e:
            last_error = e
            if attempt < _MAX_RETRIES:
                logger.warning(f"Translation attempt {attempt} failed, retrying: {e}")
                continue
        except Exception as e:
            # Unexpected error — don't retry, just fail through.
            last_error = e
            break

    logger.error(f"Translation failed after {_MAX_RETRIES} attempt(s) ({settings.OLLAMA_MODEL}): {last_error}")
    return f"[translation unavailable] {text}"


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Synchronous wrapper kept for backward compat with the worker."""
    logger.debug(f"translating {len(text)} chars from {source_lang} to {target_lang}")

    if source_lang == target_lang:
        return text

    coro = translate_text_async(text, source_lang, target_lang)
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        # No loop running in this thread — safe to drive it directly.
        return asyncio.run(coro)

    # Already inside an event loop (e.g. an arq worker) — asyncio.run()
    # would raise here, so hand the coroutine to the shared thread pool instead.
    try:
        return _executor.submit(asyncio.run, coro).result()
    except Exception as e:
        logger.error(f"Sync translate fallback failed: {e}")
        return f"[translation unavailable] {text}"


@lru_cache(maxsize=512)
def _cached_translate_sync(text: str, source_lang: str, target_lang: str) -> str:
    """LRU-cached variant for repeated strings (e.g. common UI text).

    Only use this for short, frequently-repeated strings — the cache key
    is the exact text, so it won't help with unique user messages.
    """
    return translate_text(text, source_lang, target_lang)