import io
import secrets
import uuid
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Device, Share, FileItem, AuditLog
from app.schemas import ShareOut, ShareCreateResponse
from app.device_auth import get_current_device, require_sharer
from app.file_validation import validate_upload
from app.file_scanner import scan_file
from app.network import get_lan_ip
from app.connection_code import encode_connection_code
from app.rate_limit import limit

router = APIRouter(prefix="/shares", tags=["shares"])

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

SHARE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford, matches connection codes


def _generate_share_code(db: Session, length: int = 10) -> str:
    """Short, unguessable-enough code for one share. Retries on the rare collision."""
    for _ in range(20):
        code = "".join(secrets.choice(SHARE_CODE_ALPHABET) for _ in range(length))
        if not db.query(Share).filter(Share.code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique share code, try again")


def _get_active_share(db: Session, code: str) -> Share:
    share = db.query(Share).filter(Share.code == code.upper()).first()
    if not share or not share.is_active:
        raise HTTPException(status_code=404, detail="This share doesn't exist or has been closed")
    if share.expires_at and share.expires_at < datetime.utcnow():
        for item in list(share.files):
            (Path(settings.UPLOAD_DIR) / item.stored_name).unlink(missing_ok=True)
            db.delete(item)
        db.commit()
        raise HTTPException(status_code=410, detail="This share has expired")
    return share


def _build_connect_info(share: Share) -> ShareCreateResponse:
    """
    Shared by share creation AND by re-fetching the code for an older, still
    -open share — so a sharer can always pull up a past share's QR/code again
    without it disappearing once a newer share gets created.
    """
    ip = get_lan_ip()
    connection_code = encode_connection_code(ip, settings.BACKEND_PORT)
    combined_code = f"{connection_code}.{share.code}"
    join_url = f"http://{ip}:{settings.BACKEND_PORT}/receive?server=http://{ip}:{settings.BACKEND_PORT}&code={share.code}"

    return ShareCreateResponse(
        share=share,
        combined_code=combined_code,
        join_url=join_url,
        qr_url=f"http://{ip}:{settings.BACKEND_PORT}/shares/{share.code}/qr",
    )


# ---- Creating and managing shares (any device with can_share) ----

@router.post("", response_model=ShareCreateResponse)
async def create_share(
    uploads: list[UploadFile] = FastAPIFile(...),
    label: str = Form("Shared files"),
    expires_in_hours: int | None = Form(None),
    db: Session = Depends(get_db),
    device: Device = Depends(require_sharer),
):
    if not uploads:
        raise HTTPException(status_code=400, detail="Attach at least one file")
    if len(uploads) > settings.MAX_FILES_PER_SHARE:
        raise HTTPException(status_code=400, detail=f"A share may contain at most {settings.MAX_FILES_PER_SHARE} files")
    if expires_in_hours is not None and not 1 <= expires_in_hours <= 24 * 30:
        raise HTTPException(status_code=400, detail="Expiry must be between 1 hour and 30 days")

    share = Share(
        code=_generate_share_code(db),
        label=label,
        created_by_id=device.id,
        expires_at=(datetime.utcnow() + timedelta(hours=expires_in_hours)) if expires_in_hours else None,
    )
    db.add(share)
    db.flush()  # get share.id without committing yet, so files can reference it

    created_paths: list[Path] = []
    batch_size = 0
    try:
        for upload in uploads:
            stored_name = f"{uuid.uuid4().hex}{Path(upload.filename).suffix.lower()}"
            path = Path(settings.UPLOAD_DIR) / stored_name
            sample, size = bytearray(), 0
            with path.open("xb") as destination:
                while chunk := await upload.read(1024 * 1024):
                    size += len(chunk)
                    batch_size += len(chunk)
                    if size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024 or batch_size > settings.MAX_UPLOAD_BATCH_SIZE_MB * 1024 * 1024:
                        raise HTTPException(status_code=400, detail="Upload exceeds the configured size limit")
                    if len(sample) < 8192:
                        sample.extend(chunk[:8192 - len(sample)])
                    destination.write(chunk)
            content_type = validate_upload(upload.filename, bytes(sample), size)
            scan = scan_file(path, upload.filename)
            created_paths.append(path)
            db.add(FileItem(
                original_name=upload.filename,
                stored_name=stored_name,
                content_type=content_type,
                size_bytes=size,
                sha256=scan.sha256,
                scan_status=scan.status,
                scan_message=scan.message,
                share_id=share.id,
            ))
    except Exception:
        db.rollback()
        for path in created_paths + ([path] if 'path' in locals() else []):
            path.unlink(missing_ok=True)
        raise

    db.add(AuditLog(device_id=device.id, action="create_share", detail=f"code={share.code}, files={len(uploads)}"))
    db.commit()
    db.refresh(share)

    return _build_connect_info(share)


@router.get("/mine", response_model=list[ShareOut])
def list_my_shares(db: Session = Depends(get_db), device: Device = Depends(require_sharer)):
    if device.is_owner:
        # All linked owner devices represent the same superadmin workspace.
        return db.query(Share).join(Device, Share.created_by_id == Device.id).filter(Device.is_owner.is_(True)).order_by(Share.created_at.desc()).all()
    return db.query(Share).filter(Share.created_by_id == device.id).order_by(Share.created_at.desc()).all()


@router.get("/{code}/connect-info", response_model=ShareCreateResponse)
def share_connect_info(
    code: str,
    db: Session = Depends(get_db),
    device: Device = Depends(require_sharer),
):
    """Re-fetch the QR/code for a share created earlier."""
    share = db.query(Share).filter(Share.code == code.upper()).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.created_by_id != device.id and not (device.is_owner and share.created_by.is_owner):
        raise HTTPException(status_code=403, detail="You can only view your own shares' codes")
    if not share.is_active:
        raise HTTPException(status_code=410, detail="This share has been closed")

    return _build_connect_info(share)


@router.delete("/{code}")
def close_share(
    code: str,
    db: Session = Depends(get_db),
    device: Device = Depends(require_sharer),
):
    share = db.query(Share).filter(Share.code == code.upper()).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.created_by_id != device.id and not (device.is_owner and share.created_by.is_owner):
        raise HTTPException(status_code=403, detail="You can only close your own shares")

    for item in list(share.files):
        (Path(settings.UPLOAD_DIR) / item.stored_name).unlink(missing_ok=True)
        db.delete(item)
    share.is_active = False
    db.add(AuditLog(device_id=device.id, action="close_share", detail=f"code={code}"))
    db.commit()
    return {"ok": True}


# ---- Viewing and downloading a share (PUBLIC — no device permission needed) ----

@router.get("/{code}", response_model=ShareOut)
def view_share(code: str, request: Request, db: Session = Depends(get_db)):
    limit(request, "share-view", 30)
    share = _get_active_share(db, code)
    db.add(AuditLog(device_id=None, action="view_share", detail=f"code={share.code}"))
    db.commit()
    return share


@router.get("/{code}/files/{file_id}/download")
def download_share_file(code: str, file_id: int, request: Request, accept_risk: bool = Query(False), db: Session = Depends(get_db)):
    limit(request, "download", 60)
    share = _get_active_share(db, code)
    item = next((f for f in share.files if f.id == file_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="File not found in this share")
    if item.scan_status != "clean" and not accept_risk:
        raise HTTPException(status_code=409, detail="This file was not verified as safe. Explicit risk acceptance is required.")

    path = Path(settings.UPLOAD_DIR) / item.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing from storage")

    db.add(AuditLog(device_id=None, action="download", detail=f"share={share.code}, file={item.original_name}"))
    db.commit()

    return FileResponse(path, filename=item.original_name, media_type=item.content_type)


@router.get("/{code}/files/{file_id}/preview")
def preview_share_file(code: str, file_id: int, db: Session = Depends(get_db)):
    """Same file as /download, but no attachment header, so the browser renders it inline."""
    share = _get_active_share(db, code)
    item = next((f for f in share.files if f.id == file_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="File not found in this share")
    if item.scan_status != "clean":
        raise HTTPException(status_code=409, detail="Preview is disabled because this file was not verified as safe")

    path = Path(settings.UPLOAD_DIR) / item.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing from storage")

    return FileResponse(path, media_type=item.content_type)


@router.get("/{code}/download-all")
def download_share_zip(code: str, request: Request, accept_risk: bool = Query(False), db: Session = Depends(get_db)):
    limit(request, "download", 20)
    share = _get_active_share(db, code)
    if not share.files:
        raise HTTPException(status_code=404, detail="This share has no files")
    if any(item.scan_status != "clean" for item in share.files) and not accept_risk:
        raise HTTPException(status_code=409, detail="This share contains files that were not verified as safe. Explicit risk acceptance is required.")

    # The archive is written to a temporary file instead of occupying RAM.
    archive = Path(settings.UPLOAD_DIR) / f".download-{uuid.uuid4().hex}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in share.files:
            path = Path(settings.UPLOAD_DIR) / item.stored_name
            if path.exists(): zf.write(path, arcname=item.original_name)

    db.add(AuditLog(device_id=None, action="download_all", detail=f"share={share.code}"))
    db.commit()

    safe_label = "".join(c for c in share.label if c.isalnum() or c in " -_").strip() or "share"
    return FileResponse(archive, media_type="application/zip", filename=f"{safe_label}.zip", background=BackgroundTask(archive.unlink, missing_ok=True))


@router.get("/{code}/qr")
def share_qr(code: str, db: Session = Depends(get_db)):
    import qrcode
    share = _get_active_share(db, code)

    ip = get_lan_ip()
    join_url = f"http://{ip}:{settings.BACKEND_PORT}/receive?server=http://{ip}:{settings.BACKEND_PORT}&code={share.code}"
    img = qrcode.make(join_url)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
