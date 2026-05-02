from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "backend" / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
CONTEXT_IMAGE_PATH = DATA_DIR / "context_image1.png"


def ensure_uploads_dir():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def get_uploaded_pdf_paths():
    ensure_uploads_dir()
    return sorted([p for p in UPLOADS_DIR.glob("*.pdf") if p.is_file()])
