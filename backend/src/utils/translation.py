import re
import os

import google.generativeai as genai


def clean_text(text: str) -> str:
    text = re.sub(r"\n{1,}", "\n", text)
    return text.strip()


LANGUAGE_MAP = {
    "en": "English",
    "fr": "French",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
}


def translate_text_auto(text: str, dest_lang: str) -> str:
    lang_code = (dest_lang or "en").lower()
    if lang_code == "en":
        return text

    target_language = LANGUAGE_MAP.get(lang_code, "English")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return text

    try:
        genai.configure(api_key=api_key)
        model_name = os.getenv("GEMINI_TRANSLATE_MODEL", os.getenv("GEMINI_TEXT_MODEL", "models/gemini-2.5-flash"))
        model = genai.GenerativeModel(model_name)
        prompt = (
            f"Translate the following text to {target_language}. "
            "Keep meaning exact. Keep markdown formatting unchanged. "
            "Return only translated text.\n\n"
            f"{text}"
        )
        result = model.generate_content(prompt)
        translated = (result.text or "").strip()
        return translated if translated else text
    except Exception:
        return text


def restructure_prompt(prompt: str, lang: str) -> str:
    return translate_text_auto(prompt, lang)
