import os
import pickle
from pathlib import Path

# Disable joblib/loky multiprocessing — crashes on macOS Python 3.14
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from sentence_transformers import CrossEncoder, SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer

from src.config.settings import DATA_DIR, get_uploaded_pdf_paths
from src.services.text_service import extract_text_from_pdf

# --------------------------------------------------------------------------- #
# Singletons — loaded once per process                                        #
# --------------------------------------------------------------------------- #
_bi_encoder: SentenceTransformer | None = None
_cross_encoder: CrossEncoder | None = None

FAISS_INDEX_PATH = DATA_DIR / "faiss.index"
FAISS_META_PATH = DATA_DIR / "faiss_meta.pkl"  # stores texts + metadata list


def _get_bi_encoder() -> SentenceTransformer:
    global _bi_encoder
    if _bi_encoder is None:
        # 768-dim, best general-purpose English model from SBERT
        _bi_encoder = SentenceTransformer("all-mpnet-base-v2")
    return _bi_encoder


def _get_cross_encoder() -> CrossEncoder:
    global _cross_encoder
    if _cross_encoder is None:
        # Trained on STSB semantic textual similarity — outputs 0..1 similarity
        # scores. Better than ms-marco for resume↔job-description matching since
        # ms-marco is trained on web search passages, not structured documents.
        _cross_encoder = CrossEncoder("cross-encoder/stsb-roberta-base")
    return _cross_encoder


# --------------------------------------------------------------------------- #
# Embedding                                                                   #
# --------------------------------------------------------------------------- #

def create_embeds(texts: list[str]) -> np.ndarray:
    model = _get_bi_encoder()
    # normalize_embeddings=True → unit vectors → inner product == cosine similarity
    return model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)


# --------------------------------------------------------------------------- #
# FAISS index build                                                            #
# --------------------------------------------------------------------------- #

def rebuild_vector_store() -> dict:
    pdf_paths = get_uploaded_pdf_paths()
    if not pdf_paths:
        raise RuntimeError("No uploaded PDFs found for indexing")

    all_texts: list[str] = []
    all_metadata: list[dict] = []

    for pdf_path in pdf_paths:
        pages = extract_text_from_pdf(str(pdf_path))
        for page_number, text in enumerate(pages):
            if not text or not text.strip():
                continue
            all_texts.append(text)
            all_metadata.append({
                "page_number": int(page_number),
                "original_text": text,
                "source_pdf": pdf_path.name,
            })

    if not all_texts:
        raise RuntimeError("No extractable text found in uploaded PDFs")

    embeddings = create_embeds(all_texts)          # (N, 768) float32
    dim = embeddings.shape[1]

    # IndexFlatIP = exact inner product search (== cosine on unit vectors)
    # For scale: swap to IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    faiss.write_index(index, str(FAISS_INDEX_PATH))
    with open(FAISS_META_PATH, "wb") as f:
        pickle.dump({"texts": all_texts, "metadata": all_metadata}, f)

    return {"indexed": len(all_texts), "dimension": dim}


def _load_index():
    if not FAISS_INDEX_PATH.exists() or not FAISS_META_PATH.exists():
        raise RuntimeError("FAISS index not found — upload PDFs first to rebuild it")
    index = faiss.read_index(str(FAISS_INDEX_PATH))
    with open(FAISS_META_PATH, "rb") as f:
        store = pickle.load(f)
    return index, store["texts"], store["metadata"]


# --------------------------------------------------------------------------- #
# Hybrid scoring: semantic (cosine) + TF-IDF keyword overlap                 #
# --------------------------------------------------------------------------- #

def _tfidf_scores(query: str, candidates: list[str]) -> np.ndarray:
    """Return per-candidate TF-IDF cosine similarity against the query."""
    if not candidates:
        return np.array([])
    vectorizer = TfidfVectorizer(stop_words="english")
    corpus = [query] + candidates
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        return np.zeros(len(candidates))
    query_vec = tfidf_matrix[0]
    doc_vecs = tfidf_matrix[1:]
    # cosine similarity: dot / (norm_q * norm_d)
    dots = (doc_vecs @ query_vec.T).toarray().flatten()
    norm_q = np.linalg.norm(query_vec.toarray())
    norms_d = np.array([np.linalg.norm(doc_vecs[i].toarray()) for i in range(len(candidates))])
    denom = norm_q * norms_d
    return np.where(denom > 0, dots / denom, 0.0)


_STOPWORDS = {
    "a", "an", "the", "and", "or", "for", "in", "on", "at", "to", "of",
    "with", "is", "are", "was", "be", "that", "this", "it", "as", "by",
    "from", "role", "position", "candidate", "candidates", "rank", "best",
    "find", "good", "looking", "need", "who", "has", "have", "experience",
    "work", "working", "using", "use", "used", "build", "built",
}

# High-value technical terms — matches here are weighted 3× vs generic tokens
_TECH_MULTIPLIER = 3.0
_TECH_TERMS = {
    "pytorch", "tensorflow", "keras", "jax", "transformers", "bert", "gpt",
    "cnn", "rnn", "lstm", "bilstm", "attention", "vit", "diffusion",
    "autoencoder", "gan", "rlhf", "lora", "finetune", "fine-tuning",
    "backprop", "gradient", "optimizer", "adamw", "loss", "perceptual",
    "faiss", "vector", "embedding", "semantic", "retrieval", "rag",
    "langchain", "llm", "nlp", "cv", "computer", "vision", "research",
    "react", "nextjs", "nodejs", "typescript", "fastapi", "django", "flask",
    "docker", "kubernetes", "aws", "gcp", "azure", "sql", "nosql", "redis",
    "spark", "hadoop", "kafka", "airflow", "dbt", "pandas", "numpy",
}


def _skill_boost(query: str, text: str) -> float:
    """
    Weighted skill match: technical terms count 3×, generic tokens count 1×.
    Only whole-word matches. Stopwords excluded entirely.
    Result normalised to [0, 1] so a pure-tech query maxes at 1.0.
    """
    import re
    query_tokens = [
        t for t in re.findall(r"[a-z0-9#+._/-]+", query.lower())
        if t not in _STOPWORDS and len(t) > 2
    ]
    if not query_tokens:
        return 0.0
    text_lower = text.lower()
    score = 0.0
    max_score = 0.0
    for t in query_tokens:
        weight = _TECH_MULTIPLIER if t in _TECH_TERMS else 1.0
        max_score += weight
        if re.search(rf"\b{re.escape(t)}\b", text_lower):
            score += weight
    return score / max_score if max_score > 0 else 0.0


# --------------------------------------------------------------------------- #
# Two-stage retrieval: bi-encoder → hybrid score → cross-encoder rerank      #
# --------------------------------------------------------------------------- #

def vector_search(query: str, top_k: int = 3) -> dict:
    """
    Stage 1 — bi-encoder: retrieve top-10 candidates from FAISS (fast).
    Stage 2 — hybrid score: re-weight with TF-IDF + skill boost.
    Stage 3 — cross-encoder: precise (query, passage) pair scoring on top-10.
    Returns top_k results with all scores attached to metadata.
    """
    index, all_texts, all_metadata = _load_index()

    # ── Stage 1: bi-encoder retrieval ──────────────────────────────────────
    bi_encoder = _get_bi_encoder()
    query_vec = bi_encoder.encode(
        [query], convert_to_numpy=True, normalize_embeddings=True    )                                                    # (1, 768)
    stage1_k = min(10, index.ntotal)
    scores_ip, indices = index.search(query_vec, stage1_k)
    semantic_scores = scores_ip[0]                       # cosine similarity
    retrieved_indices = indices[0]

    candidates_text = [all_texts[i] for i in retrieved_indices]
    candidates_meta = [all_metadata[i] for i in retrieved_indices]

    # ── Stage 2: hybrid scoring ─────────────────────────────────────────────
    tfidf = _tfidf_scores(query, candidates_text)
    skill = np.array([_skill_boost(query, t) for t in candidates_text])

    # Hybrid: semantic captures meaning, skill boost captures exact tech matches
    # (weighted 3× for known tech terms), TF-IDF captures rare domain words.
    # Skill boost dominates deliberately — for resume ranking, exact skill
    # presence is more reliable than vector similarity on short texts.
    hybrid_scores = 0.35 * semantic_scores + 0.15 * tfidf + 0.50 * skill

    # ── Stage 3: cross-encoder rerank ───────────────────────────────────────
    cross_encoder = _get_cross_encoder()
    pairs = [(query, t) for t in candidates_text]
    cross_scores = cross_encoder.predict(pairs)

    def _norm(arr):
        lo, hi = arr.min(), arr.max()
        return (arr - lo) / (hi - lo) if hi > lo else np.full_like(arr, 0.5)

    hybrid_norm = _norm(hybrid_scores)
    ce_norm = _norm(cross_scores)

    # Cross-encoder is kept for transparency (stored in metadata for UI display)
    # but excluded from final ranking — generic similarity models are not
    # reliable for resume↔JD ranking on short texts and introduce bias.
    # Hybrid (semantic + weighted skill boost + TF-IDF) is the final ranker.
    final_scores = hybrid_norm

    # Sort and take top_k
    ranked = sorted(
        range(len(candidates_text)),
        key=lambda i: final_scores[i],
        reverse=True,
    )[:top_k]

    matches = []
    for rank, i in enumerate(ranked):
        meta = dict(candidates_meta[i])
        meta["score_semantic"] = float(round(semantic_scores[i], 4))
        meta["score_tfidf"] = float(round(tfidf[i], 4))
        meta["score_skill"] = float(round(skill[i], 4))
        meta["score_cross_encoder"] = float(round(ce_norm[i], 4))   # normalised [0,1]
        meta["score_cross_encoder_raw"] = float(round(cross_scores[i], 4))
        meta["score_final"] = float(round(final_scores[i], 4))
        meta["rank"] = rank + 1
        matches.append({"id": str(retrieved_indices[i]), "metadata": meta})

    return {"matches": matches}
