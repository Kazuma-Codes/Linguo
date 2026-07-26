from ftlangdetect import detect
import httpx, json, logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def detect_language(text: str) -> str:
    result = detect(text)
    return result['lang']

async def _unload_model(model: str):
    """Tell Ollama to immediately unload a model from VRAM."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": "", "keep_alive": 0},
            )
    except Exception:
        pass  # Best-effort — if it fails, Ollama will auto-swap anyway

async def translate_text_async(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text using Qwen (primary model).
    
    After translating, the model stays loaded (keep_alive=5m default)
    so back-to-back translations are fast. It will be auto-evicted
    by Ollama when Gemma needs VRAM for cultural analysis.
    """
    if source_lang == target_lang:
        return text
    prompt = (
        f"Translate the following text from {source_lang} to {target_lang}. "
        f"Reply ONLY with the translation, nothing else.\n\n{text}"
    )
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            if res.status_code == 200:
                return res.json().get("response", text).strip()
    except Exception as e:
        logger.error(f"Translation failed ({settings.OLLAMA_MODEL}): {e}")
    # Fallback: return original text with prefix
    return f"[translation unavailable] {text}"

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Synchronous wrapper kept for backward compat with the worker."""
    logger.info(f"translating '{text}' from {source_lang} to {target_lang}")
    if source_lang == target_lang:
        return text
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an async context (e.g., arq worker) — can't use asyncio.run
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, translate_text_async(text, source_lang, target_lang)).result()
        return asyncio.run(translate_text_async(text, source_lang, target_lang))
    except Exception as e:
        logger.error(f"Sync translate fallback failed: {e}")
        return f"[translation unavailable] {text}"