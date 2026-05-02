# ResearchLens

An AI-powered document intelligence platform. Upload research papers or resumes as PDFs, ask questions in natural language, and get contextual answers — with a two-stage deep learning retrieval pipeline under the hood.

---

## What it does

**Research mode** — upload academic PDFs, ask questions, get answers grounded strictly in the document context. Relevant images/figures are extracted and scored for inclusion automatically.

**Resume intelligence mode** — upload candidate resumes, enter a job description, get a ranked list of candidates with per-candidate ATS scores, skill gap analysis, and Gemini-generated explanations of fit.

The system auto-detects which mode to use based on the query and uploaded filenames.

---

## Architecture

```
PDF Upload
    │
    ▼
Text Extraction (PyMuPDF)
    │
    ▼
Bi-encoder Embedding (all-mpnet-base-v2, 768d)
    │  normalize_embeddings=True → unit vectors
    ▼
FAISS IndexFlatIP  ←── persisted to data/faiss.index
    │
    ▼  (at query time)
Stage 1: Bi-encoder retrieval — top-10 candidates (fast, precomputed)
    │
    ▼
Stage 2: Hybrid scoring
    │   0.6 × semantic (cosine)
    │   0.3 × TF-IDF keyword overlap
    │   0.1 × skill boost (exact token match rate)
    ▼
Stage 3: Cross-encoder rerank (cross-encoder/ms-marco-MiniLM-L-6-v2)
    │   sees (query, passage) as a pair — full attention, no precomputation
    │   final = 0.4 × hybrid + 0.6 × cross-encoder
    ▼
Top-3 results → Gemini (text generation + image analysis)
    │
    ▼
Response + candidate score breakdown → Next.js UI
```

---

## Deep learning concepts demonstrated

| Concept | Where |
|---|---|
| **Transformer encoder / mean pooling** | `all-mpnet-base-v2` bi-encoder in `vector_service.py` |
| **Bi-encoder vs cross-encoder tradeoff** | Stage 1 (fast, independent encoding) vs Stage 3 (slow, joint attention) |
| **Dense retrieval with FAISS** | `IndexFlatIP` — exact inner product search on unit vectors |
| **Hybrid retrieval** | Dense (neural) + sparse (TF-IDF) + lexical (skill boost) combined score |
| **Re-ranking** | Cross-encoder as a second-pass scorer over the bi-encoder's shortlist |
| **RAG** | Retrieved chunks passed as context to Gemini for grounded generation |

---

## Project structure

```
ResearchLens/
├── backend/
│   ├── app.py                          # entry point (python app.py)
│   ├── .env                            # secrets (not committed)
│   ├── .env.example                    # template
│   └── src/
│       ├── app.py                      # Flask app factory, CORS config
│       ├── auth.py                     # JWT bearer token verification (HS256)
│       ├── api/
│       │   └── routes.py               # /api, /uploadpdf, /status endpoints
│       ├── config/
│       │   └── settings.py             # paths, uploads dir, PDF listing
│       ├── services/
│       │   ├── vector_service.py       # FAISS index + two-stage retrieval pipeline
│       │   ├── query_service.py        # Gemini generation, resume vs research mode
│       │   ├── text_service.py         # PyMuPDF text extraction
│       │   ├── document_service.py     # PDF ↔ DOCX conversion utilities
│       │   └── image_analysis_service.py  # Gemini Vision image analysis
│       └── utils/
│           ├── pdf_extract.py          # page-level image extraction from PDFs
│           ├── image_quality.py        # image size/quality filter
│           └── translation.py         # Gemini-powered multilingual translation
└── frontend/
    ├── pages/
    │   ├── index.js                    # landing page
    │   ├── search.js                   # main workspace
    │   ├── login.js / signup.js        # auth pages
    │   └── api/                        # Next.js API routes
    └── components/
        ├── Chat.jsx                    # message thread with markdown rendering
        ├── Upload.jsx                  # PDF upload with indexed files strip
        ├── ResumeResults.jsx           # candidate cards with score breakdown bars
        ├── Navbar.jsx
        └── Loading.jsx
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend framework | Flask + Flask-RESTful |
| Bi-encoder | `sentence-transformers` — `all-mpnet-base-v2` (768d) |
| Cross-encoder | `sentence-transformers` — `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Vector index | FAISS `IndexFlatIP` (local, no external service) |
| Sparse retrieval | scikit-learn `TfidfVectorizer` |
| PDF text extraction | PyMuPDF (`fitz`) |
| LLM / vision | Google Gemini (`gemini-1.5-flash` default, configurable) |
| Auth | JWT HS256 (`PyJWT`) |
| Frontend | Next.js + Tailwind CSS |
| Translation | Gemini (5 languages: en, fr, hi, ta, te) |

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install flask flask-restful flask-cors pymupdf sentence-transformers faiss-cpu scikit-learn PyJWT google-generativeai Pillow pdf2docx python-docx requests
```

Copy `.env.example` to `.env` and fill in:

```env
GEMINI_API_KEY=...
PINECONE_API_KEY=...        # no longer used — kept for reference
GEMINI_TEXT_MODEL=gemini-1.5-flash
GEMINI_VISION_MODEL=gemini-1.5-flash
ACCESS_TOKEN_SECRET=...     # must match frontend ACCESS_TOKEN_SECRET
```

On first run, `all-mpnet-base-v2` (~438 MB) and `ms-marco-MiniLM-L-6-v2` download automatically from HuggingFace and are cached at `~/.cache/huggingface/hub/`. Set `HF_TOKEN` env var to avoid rate limits.

```bash
python app.py
# runs on http://localhost:5001
```

### Frontend

```bash
cd frontend
npm install
# copy .env.local.example to .env.local and set NEXT_PUBLIC_BACKEND_URL + ACCESS_TOKEN_SECRET
npm run dev
# runs on http://localhost:3000
```

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/status` | JWT | List indexed PDFs |
| `POST` | `/uploadpdf` | JWT | Upload PDF(s), rebuild FAISS index |
| `POST` | `/api` | JWT | Query — `{ key: 101, query: "...", language: "en" }` |

**Query response shape:**
```json
{
  "data": [
    "answer text from Gemini",
    false,
    [
      {
        "source_pdf": "Harsh_Shah.pdf",
        "page_number": 0,
        "original_text": "...",
        "score_semantic": 0.812,
        "score_tfidf": 0.341,
        "score_skill": 0.25,
        "score_cross_encoder": 6.42,
        "score_final": 0.743,
        "rank": 1
      }
    ]
  ]
}
```

---

## Retrieval pipeline detail

### Why two encoders?

**Bi-encoder** (`all-mpnet-base-v2`) encodes documents and queries independently into 768-dimensional vectors at index time. Retrieval is a single FAISS inner product search — O(N) but highly optimized. Fast enough to run over thousands of documents in milliseconds.

**Cross-encoder** (`ms-marco-MiniLM-L-6-v2`) takes a `(query, passage)` pair and runs full transformer attention across both simultaneously. It cannot precompute — it runs at query time on the shortlist only. Significantly more accurate because it models interaction between query and document tokens directly.

### Hybrid scoring formula

```
hybrid = 0.6 × semantic + 0.3 × tfidf + 0.1 × skill_boost
final  = 0.4 × hybrid   + 0.6 × cross_encoder_normalized
```

- **Semantic**: cosine similarity from FAISS (inner product on unit vectors)
- **TF-IDF**: sparse keyword overlap — catches exact technology/skill names that dense vectors sometimes miss
- **Skill boost**: fraction of query tokens found verbatim in the candidate — rewards precise skill matches
- **Cross-encoder**: joint attention score normalized to [0,1] across the candidate set

### FAISS index

Uses `IndexFlatIP` (exact brute-force inner product). For larger corpora, swap to `IndexIVFFlat` with an IVF quantizer for approximate search — the dimension and metric stay the same, only the index construction changes in `rebuild_vector_store()`.

---

## Data management

**Reset everything:**
```bash
rm backend/data/uploads/*.pdf
rm backend/data/faiss.index
rm backend/data/faiss_meta.pkl
```

Then re-upload PDFs from the UI to rebuild the index.

---

## Known limitations / future work

- **No OCR** — PyMuPDF extracts embedded text only. Scanned PDFs return empty pages. Next step: use Gemini Vision as a fallback for pages with no extractable text.
- **Full index rebuild on every upload** — incremental upsert would be faster for large corpora.
- **Single-user** — no per-user document isolation; all uploads are shared.
- **Cross-encoder downloads on first query** — ~80 MB, causes a slow first response after a fresh install.
