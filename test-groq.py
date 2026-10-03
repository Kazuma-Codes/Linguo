"""
Diagnostic script to test Groq API connectivity and response schemas.
Mirrors the exact prompts used in backend TranslationService.java.

Usage:
  python test-groq.py [YOUR_GROQ_API_KEY]
  or set the environment variable:
  $env:GROQ_API_KEY="gsk_..." (PowerShell)
  export GROQ_API_KEY="gsk_..." (Linux/macOS)
"""

import sys
import os
import json
import urllib.request
import urllib.error

def test_groq(api_key: str):
    if not api_key:
        print("[-] Error: No GROQ_API_KEY provided.")
        print("    Usage: python test-groq.py YOUR_API_KEY")
        print("    or set the GROQ_API_KEY environment variable.")
        return False

    url = "https://api.groq.com/openai/v1/chat/completions"
    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")

    print(f"[*] Testing Groq API Endpoint: {url}")
    print(f"[*] Using Model: {model}")
    print(f"[*] API Key (masked): {api_key[:7]}...{api_key[-4:] if len(api_key) > 10 else ''}")
    print("-" * 60)

    # 1. Test Translation Endpoint
    test_text = "Hello, how are you doing today?"
    src_lang = "English"
    tgt_lang = "Hindi"

    translation_prompt = (
        f"Translate the following text from {src_lang} into {tgt_lang}.\n"
        "Respond ONLY with a JSON object containing two fields:\n"
        f"1. 'native': The {tgt_lang} translation in its native script.\n"
        f"2. 'romanized': The {tgt_lang} translation written phonetically in the "
        "Latin/English alphabet (e.g., 'aapka naam kya he').\n\n"
        f"Text to translate: {test_text}"
    )

    req_body = {
        "model": model,
        "messages": [{"role": "user", "content": translation_prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 1024
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(req_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "LinguoBackend-Diagnostic/1.0"
        }
    )

    parsed_translation = {}
    try:
        print("[1/2] Sending translation request...")
        with urllib.request.urlopen(req) as response:
            status = response.status
            raw_data = response.read().decode("utf-8")
            data = json.loads(raw_data)
            content_str = data["choices"][0]["message"]["content"]
            parsed_translation = json.loads(content_str)

            print(f"[+] HTTP Status: {status} OK")
            print(f"[+] Raw Groq Output: {content_str}")
            print(f"    - Native Translation: {parsed_translation.get('native')}")
            print(f"    - Romanized Translation: {parsed_translation.get('romanized')}")

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"[-] HTTP Error {e.code} ({e.reason}):")
        print(f"    {err_body}")
        return False
    except Exception as e:
        print(f"[-] Request failed: {e}")
        return False

    print("-" * 60)

    # 2. Test Cultural Footnotes
    footnote_prompt = (
        "You are a cultural intelligence expert. Analyze:\n"
        f"Original: {test_text}\n"
        f"Translated ({tgt_lang}): {parsed_translation.get('native', '')}\n"
        'Return ONLY JSON: {"humor_explanation": "string|null", "idiom_breakdown": "string|null", "etiquette_warning": "string|null"}'
    )

    req_body_fn = {
        "model": model,
        "messages": [{"role": "user", "content": footnote_prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 256
    }

    req_fn = urllib.request.Request(
        url,
        data=json.dumps(req_body_fn).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "LinguoBackend-Diagnostic/1.0"
        }
    )

    try:
        print("[2/2] Sending cultural analysis request...")
        with urllib.request.urlopen(req_fn) as response:
            status = response.status
            raw_data = response.read().decode("utf-8")
            data = json.loads(raw_data)
            content_str = data["choices"][0]["message"]["content"]
            parsed_fn = json.loads(content_str)

            print(f"[+] HTTP Status: {status} OK")
            print(f"[+] Cultural Footnotes Output: {json.dumps(parsed_fn, indent=2)}")

    except Exception as e:
        print(f"[-] Cultural footnotes test failed: {e}")
        return False

    print("-" * 60)
    print("[SUCCESS] Groq API is functioning properly with the app schema!")
    return True

if __name__ == "__main__":
    key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("GROQ_API_KEY", "")
    test_groq(key)
