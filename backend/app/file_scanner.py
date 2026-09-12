"""Layered upload safety checks with optional Microsoft Defender scanning."""

import hashlib
import os
import subprocess
import zipfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ScanResult:
    sha256: str
    status: str  # clean, suspicious, or unscanned
    message: str


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _integrity_problem(path: Path, original_name: str) -> str | None:
    ext = Path(original_name).suffix.lower()
    try:
        if ext in {".zip", ".docx", ".xlsx", ".pptx"}:
            with zipfile.ZipFile(path) as archive:
                bad_member = archive.testzip()
                if bad_member:
                    return f"The archive contains a corrupted entry: {bad_member}"
        elif ext == ".pdf":
            with path.open("rb") as source:
                if not source.read(5).startswith(b"%PDF-"):
                    return "The file extension says PDF, but the PDF signature is missing"
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        return f"The file appears corrupted or unreadable: {exc}"
    return None


def _defender_executable() -> Path | None:
    program_data = Path(os.environ.get("ProgramData", r"C:\ProgramData"))
    platform = program_data / "Microsoft" / "Windows Defender" / "Platform"
    if platform.exists():
        candidates = sorted(platform.glob("*/MpCmdRun.exe"), reverse=True)
        if candidates:
            return candidates[0]
    fallback = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Windows Defender" / "MpCmdRun.exe"
    return fallback if fallback.exists() else None


def scan_file(path: Path, original_name: str) -> ScanResult:
    path = path.resolve()
    digest = _sha256(path)
    integrity_problem = _integrity_problem(path, original_name)
    if integrity_problem:
        return ScanResult(digest, "suspicious", integrity_problem)

    defender = _defender_executable() if os.name == "nt" else None
    if not defender:
        return ScanResult(digest, "unscanned", "Microsoft Defender scanning is unavailable on the server")

    try:
        completed = subprocess.run(
            [str(defender), "-Scan", "-ScanType", "3", "-File", str(path), "-DisableRemediation"],
            capture_output=True,
            text=True,
            timeout=180,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return ScanResult(digest, "unscanned", f"Microsoft Defender could not complete the scan: {exc}")

    output = " ".join((completed.stdout + " " + completed.stderr).split())
    if completed.returncode == 0:
        return ScanResult(digest, "clean", "Passed file-integrity checks and Microsoft Defender scan")
    message = output[-220:] if output else f"Microsoft Defender returned scan code {completed.returncode}"
    return ScanResult(digest, "suspicious", message)
