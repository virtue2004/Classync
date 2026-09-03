from datetime import datetime
import secrets

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Device


def new_device_token() -> str:
    return secrets.token_urlsafe(32)


def get_current_device(
    x_device_id: str | None = Header(default=None),
    x_device_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Device:
    """Authenticate a registered device with its public ID and private token."""
    if not x_device_id or not x_device_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Register this device before continuing.")

    device = db.query(Device).filter(Device.device_id == x_device_id).first()
    if not device or not device.device_token or not secrets.compare_digest(device.device_token, x_device_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This device credential is invalid. Reconnect to register it again.")

    device.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(device)
    return device


def require_sharer(device: Device = Depends(get_current_device)) -> Device:
    if not device.can_share:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This device isn't allowed to share files. Ask the owner to promote it.")
    return device


def require_owner(device: Device = Depends(get_current_device)) -> Device:
    if not device.is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner device can do that.")
    return device
