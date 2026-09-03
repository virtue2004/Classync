from pathlib import Path
from fastapi import HTTPException

try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

from app.config import settings

ALLOWED_MIME_PREFIXES = ("image/", "audio/", "video/", "application/pdf", "application/msword",
                         "application/vnd.openxmlformats-officedocument", "application/vnd.ms-excel",
                         "application/vnd.ms-powerpoint", "text/plain", "text/csv", "application/zip")
SAFE_FALLBACK_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp3", ".wav", ".mp4", ".webm",
                            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".zip"}


def validate_upload(filename: str, sample: bytes, size_bytes: int) -> str:
    ext = Path(filename).suffix.lower()
    if not filename or ext in settings.BLOCKED_EXTENSIONS or ext not in SAFE_FALLBACK_EXTENSIONS:
        raise HTTPException(status_code=400, detail="This file type is not allowed")
    if size_bytes > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")
    if HAS_MAGIC:
        try:
            detected = magic.from_buffer(sample, mime=True)
            if not detected.startswith(ALLOWED_MIME_PREFIXES):
                raise HTTPException(status_code=400, detail=f"File content type '{detected}' is not permitted")
            return detected
        except HTTPException:
            raise
        except Exception:
            pass
    # Fail safely when libmagic is unavailable: browsers will download rather
    # than inline-render content whose signature could not be verified.
    return "application/octet-stream"
