import os

import google.generativeai as genai
from PIL import Image

from src.config.settings import CONTEXT_IMAGE_PATH


def image_analysis():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is required for image analysis")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-pro-vision")
    img = Image.open(CONTEXT_IMAGE_PATH)
    res = model.generate_content(
        [
            "Read the image find all the possible details in this and then if its a graph give good analysis that is useful. make sure to give only useful information",
            img,
        ]
    )
    return res.candidates[0].content.parts[0].text
