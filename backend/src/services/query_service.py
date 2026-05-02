import os
from io import BytesIO
from pathlib import Path

import google.generativeai as genai
from PIL import Image

from src.config.settings import CONTEXT_IMAGE_PATH, UPLOADS_DIR
from src.services.image_analysis_service import image_analysis
from src.services.vector_service import vector_search
from src.utils.pdf_extract import extract_data_from_pdf
from src.utils.translation import restructure_prompt

_RESUME_KEYWORDS = {"resume", "cv", "curriculum", "candidate", "hire", "job", "role",
                    "experience", "skills", "position", "applicant", "developer",
                    "engineer", "analyst", "manager", "internship"}


def _is_resume_query(query: str, source_pdfs: list[str]) -> bool:
    """Heuristic: query mentions hiring terms OR sources look like resumes."""
    q_lower = query.lower()
    if any(kw in q_lower for kw in _RESUME_KEYWORDS):
        return True
    resume_name_hints = {"resume", "cv", "_resume", "-resume"}
    for pdf in source_pdfs:
        pdf_lower = pdf.lower()
        if any(h in pdf_lower for h in resume_name_hints):
            return True
    return False


def _generate_with_fallback(primary_model_name: str, prompt_or_parts):
    fallback_model = "gemini-1.5-flash"
    try:
        model = genai.GenerativeModel(primary_model_name)
        return model.generate_content(prompt_or_parts)
    except Exception as exc:
        if "is not found" in str(exc) or "not supported for generateContent" in str(exc):
            model = genai.GenerativeModel(fallback_model)
            return model.generate_content(prompt_or_parts)
        raise


def _build_research_prompt(context: str, query: str) -> str:
    return f"""Answer the query in detail using only the context below. Do not add information from outside the context. Summarize the entire document if the query suggests it.
Context: {context}
Query: {query}"""


def _build_resume_prompt(context: str, query: str, candidates: list[dict]) -> str:
    """
    Resume-mode prompt: asks Gemini to reason about candidate relevance,
    explain why each candidate matches, and produce ATS-style scoring.
    """
    candidate_block = ""
    for c in candidates:
        candidate_block += (
            f"\n--- Candidate: {c['source_pdf']} (page {c['page_number']}) ---\n"
            f"Semantic score: {c['score_semantic']} | "
            f"TF-IDF score: {c['score_tfidf']} | "
            f"Skill boost: {c['score_skill']} | "
            f"Cross-encoder score: {c['score_cross_encoder']} | "
            f"Final rank score: {c['score_final']}\n"
            f"{c['original_text']}\n"
        )

    return f"""You are an expert technical recruiter and ATS system. A job description or hiring query has been submitted. Below are the top-ranked resume excerpts retrieved by a two-stage retrieval pipeline (bi-encoder → cross-encoder reranking with TF-IDF + skill boost hybrid scoring).

For each candidate:
1. State clearly why they are or are not a good match for the query/job description.
2. List matching skills and technologies found in their resume.
3. Note any gaps or missing requirements.
4. Give an ATS-style fit score out of 100.

Job Description / Query: {query}

Retrieved Candidates:
{candidate_block}

Provide a structured ranking with clear reasoning for each candidate. Be specific — cite actual skills, technologies, and experience from the resume text."""


def image_text(query: str, language: str = "en"):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is required for query generation")
    genai.configure(api_key=api_key)

    results = vector_search(query, top_k=3)
    context = ""
    page_refs = []
    candidates = []

    for match in results["matches"]:
        meta = match["metadata"]
        context += meta["original_text"]
        page_refs.append({
            "page_number": int(meta["page_number"]),
            "source_pdf": meta.get("source_pdf"),
        })
        candidates.append(meta)

    source_pdfs = [c.get("source_pdf", "") for c in candidates]
    resume_mode = _is_resume_query(query, source_pdfs)

    # ── Image extraction (research mode only — resumes rarely have useful images) ──
    related_images = []
    if not resume_mode:
        for ref in page_refs:
            page_num = ref["page_number"]
            source_pdf = ref.get("source_pdf")
            pdf_path = (UPLOADS_DIR / source_pdf) if source_pdf else None
            if not pdf_path or not Path(pdf_path).exists():
                continue
            page_num = max(1, int(page_num))
            image_list = extract_data_from_pdf(
                str(pdf_path),
                start_page=page_num,
                end_page=page_num,
                extract_images=True,
                extract_text=False,
                save_images=False,
                image_save_path="",
                online_pdf=False,
            )
            for image in image_list[0]:
                related_images.append(image[1])

    vision_model_name = os.getenv("GEMINI_VISION_MODEL", "gemini-1.5-flash")
    relevance_scores = [0]
    has_image_context = False

    for image in related_images:
        image_pil = Image.open(BytesIO(image))
        result = _generate_with_fallback(
            vision_model_name,
            [
                f"Rate this image on scale of 0 to 100 in relevance to the following query {query} and do not describe the image at all, give only numerical output",
                image_pil,
            ],
        )
        try:
            relevance_scores.append(int((result.text or "").strip()))
        except Exception:
            pass

    max_score = max(relevance_scores)
    if max_score > 60 and related_images:
        has_image_context = True
        max_score_index = relevance_scores.index(max_score)
        context_image = related_images[max_score_index - 1]
        with open(CONTEXT_IMAGE_PATH, "wb") as f:
            f.write(context_image)

    # ── Generate response ────────────────────────────────────────────────────
    text_model_name = os.getenv("GEMINI_TEXT_MODEL", "gemini-1.5-flash")

    if resume_mode:
        prompt = _build_resume_prompt(context, query, candidates)
    else:
        prompt = _build_research_prompt(context, query)

    response = _generate_with_fallback(text_model_name, prompt)
    response_text = response.text or ""

    if has_image_context:
        if response_text.startswith("I apologize, but the context you provided"):
            return (restructure_prompt(image_analysis(), language), has_image_context)
        return (restructure_prompt(response_text + image_analysis(), language), has_image_context)

    return (restructure_prompt(response_text, language), has_image_context)
