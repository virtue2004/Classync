import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Device, AuditLog
from app.schemas import (DeviceOut, DeviceRegistrationOut, DeviceRenameRequest,
                         DevicePromoteRequest, OwnerClaimRequest, SetupStatusOut)
from app.device_auth import get_current_device, new_device_token, require_owner

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("/register", response_model=DeviceRegistrationOut)
def register_device(
    x_device_id: str | None = Header(default=None),
    x_device_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Register once and issue the private credential used thereafter."""
    if not x_device_id or len(x_device_id) > 64:
        raise HTTPException(status_code=400, detail="A valid device ID is required.")
    device = db.query(Device).filter(Device.device_id == x_device_id).first()
    if device:
        if not device.device_token or not x_device_token or not secrets.compare_digest(device.device_token, x_device_token):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device already registered. Clear the saved server connection and register a new device ID.")
        device.last_seen = datetime.utcnow()
    else:
        device = Device(device_id=x_device_id, device_token=new_device_token())
        db.add(device)
    db.commit()
    db.refresh(device)
    return DeviceRegistrationOut.model_validate(device).model_copy(update={"device_token": device.device_token})


@router.get("/setup-status", response_model=SetupStatusOut)
def setup_status(db: Session = Depends(get_db)):
    return SetupStatusOut(owner_exists=db.query(Device).filter(Device.is_owner.is_(True)).count() > 0)


def _check_setup_key(key: str) -> None:
    if not settings.OWNER_SETUP_KEY or not secrets.compare_digest(key, settings.OWNER_SETUP_KEY):
        raise HTTPException(status_code=403, detail="The setup key is incorrect.")


@router.post("/recover-registration", response_model=DeviceRegistrationOut)
def recover_registration(
    payload: OwnerClaimRequest,
    x_device_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Reissue a credential for a pre-token installation under host control."""
    _check_setup_key(payload.setup_key)
    device = db.query(Device).filter(Device.device_id == x_device_id).first() if x_device_id else None
    if not device:
        raise HTTPException(status_code=404, detail="This device has not registered on this server.")
    device.device_token = new_device_token()
    db.commit()
    db.refresh(device)
    return DeviceRegistrationOut.model_validate(device).model_copy(update={"device_token": device.device_token})


@router.post("/claim-owner", response_model=DeviceOut)
def claim_owner(payload: OwnerClaimRequest, device: Device = Depends(get_current_device), db: Session = Depends(get_db)):
    _check_setup_key(payload.setup_key)
    if db.query(Device).filter(Device.is_owner.is_(True)).count():
        raise HTTPException(status_code=409, detail="This server already has an owner.")
    device.is_owner = True
    device.can_share = True
    db.add(AuditLog(device_id=device.id, action="claim_owner", detail="owner appointed with setup key"))
    db.commit()
    db.refresh(device)
    return device


@router.post("/recover-owner", response_model=DeviceOut)
def recover_owner(payload: OwnerClaimRequest, device: Device = Depends(get_current_device), db: Session = Depends(get_db)):
    """Host-only recovery path for migrated or lost owner credentials."""
    _check_setup_key(payload.setup_key)
    db.query(Device).filter(Device.is_owner.is_(True)).update({Device.is_owner: False, Device.can_share: False})
    device.is_owner = True
    device.can_share = True
    db.add(AuditLog(device_id=device.id, action="recover_owner", detail="owner recovered with setup key"))
    db.commit()
    db.refresh(device)
    return device


@router.get("/me", response_model=DeviceOut)
def whoami(device: Device = Depends(get_current_device)):
    return device


@router.patch("/me", response_model=DeviceOut)
def rename_self(payload: DeviceRenameRequest, device: Device = Depends(get_current_device), db: Session = Depends(get_db)):
    device.label = payload.label.strip() or device.label
    db.commit()
    db.refresh(device)
    return device


@router.get("", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db), _: Device = Depends(require_owner)):
    return db.query(Device).order_by(Device.last_seen.desc()).all()


@router.post("/promote", response_model=DeviceOut)
def promote_device(payload: DevicePromoteRequest, db: Session = Depends(get_db), owner: Device = Depends(require_owner)):
    target = db.query(Device).filter(Device.device_id == payload.device_id.strip()).first()
    if not target:
        raise HTTPException(status_code=404, detail="No device with that ID has connected to this server yet.")
    target.can_share = True
    if payload.label:
        target.label = payload.label.strip()
    db.add(AuditLog(device_id=owner.id, action="promote", detail=f"device={target.device_id}"))
    db.commit()
    db.refresh(target)
    return target


@router.post("/{device_id}/revoke", response_model=DeviceOut)
def revoke_device(device_id: str, db: Session = Depends(get_db), owner: Device = Depends(require_owner)):
    target = db.query(Device).filter(Device.device_id == device_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Device not found")
    if target.is_owner:
        raise HTTPException(status_code=400, detail="The owner device can't be revoked")
    target.can_share = False
    db.add(AuditLog(device_id=owner.id, action="revoke", detail=f"device={target.device_id}"))
    db.commit()
    db.refresh(target)
    return target
