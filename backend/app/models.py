from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Device(Base):
    """
    Identity here is per-device, not per-person — no usernames or passwords.
    A device generates its own random ID on first launch (see the frontend's
    device.ts) and sends it on every request. The first device ever seen by
    a fresh server automatically becomes the owner; everyone else starts as
    receive-only until the owner promotes them by their device ID.
    """
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # Server-issued credential.  The public device_id identifies a device but
    # cannot authorize it on its own.
    device_token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120), default="Unnamed device")

    can_share: Mapped[bool] = mapped_column(Boolean, default=False)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)

    first_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    shares: Mapped[list["Share"]] = relationship(back_populates="created_by")


class Share(Base):
    """
    A batch of files a sharer-permitted device has published, reachable by
    anyone on the LAN who has the share's code — no account needed to view.
    """
    __tablename__ = "shares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(150), default="Shared files")

    created_by_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    created_by: Mapped["Device"] = relationship(back_populates="shares")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    files: Mapped[list["FileItem"]] = relationship(back_populates="share", cascade="all, delete-orphan")


class FileItem(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(255), unique=True)
    content_type: Mapped[str] = mapped_column(String(120))
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), default="")
    scan_status: Mapped[str] = mapped_column(String(20), default="unscanned")
    scan_message: Mapped[str] = mapped_column(String(255), default="Antivirus scan unavailable")

    share_id: Mapped[int] = mapped_column(ForeignKey("shares.id"))
    share: Mapped["Share"] = relationship(back_populates="files")

    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """Append-only trail: who did what, when. Never edit or delete rows here."""
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80))       # e.g. "create_share", "download", "promote"
    detail: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
