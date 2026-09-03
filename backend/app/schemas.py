from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ---- Devices ----

class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: str
    label: str
    can_share: bool
    is_owner: bool
    first_seen: datetime
    last_seen: datetime


class DeviceRegistrationOut(DeviceOut):
    """Returned only when a device registers; the token is never listed later."""
    device_token: str


class OwnerClaimRequest(BaseModel):
    setup_key: str


class SetupStatusOut(BaseModel):
    owner_exists: bool


class DeviceRenameRequest(BaseModel):
    label: str


class DevicePromoteRequest(BaseModel):
    device_id: str
    label: str | None = None  # optional friendly name to set at the same time


# ---- Shares (the main receiving flow — no account needed to view/download) ----

class ShareFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_name: str
    content_type: str
    size_bytes: int


class ShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str
    created_at: datetime
    expires_at: datetime | None
    is_active: bool
    files: list[ShareFileOut]


class ShareCreateResponse(BaseModel):
    share: ShareOut
    combined_code: str      # what a laptop user types: network part + share part
    join_url: str            # what the QR code encodes
    qr_url: str               # where the frontend can fetch the PNG
