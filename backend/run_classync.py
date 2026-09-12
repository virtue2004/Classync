"""Standalone Windows entry point used by the packaged Classync server."""

import os
import secrets
import socket
import threading
import time
import traceback
import urllib.request
import webbrowser
from pathlib import Path


def data_directory() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    path = Path(base) / "Classync"
    path.mkdir(parents=True, exist_ok=True)
    return path


def ensure_configuration(path: Path) -> tuple[str, bool]:
    env_path = path / ".env"
    key_path = path / "setup-key.txt"
    created = not env_path.exists()

    if created:
        setup_key = secrets.token_hex(32)
        env_path.write_text(
            "\n".join(
                [
                    "DATABASE_URL=sqlite:///./academy_share.db",
                    "UPLOAD_DIR=./uploads",
                    "MAX_UPLOAD_SIZE_MB=200",
                    "MAX_UPLOAD_BATCH_SIZE_MB=500",
                    "MAX_FILES_PER_SHARE=50",
                    "INSTANCE_NAME=My Academy",
                    f"OWNER_SETUP_KEY={setup_key}",
                    "BACKEND_PORT=8000",
                    "FRONTEND_PORT=5500",
                    "CORS_ORIGINS=",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        key_path.write_text(setup_key + "\n", encoding="utf-8")
    else:
        setup_key = key_path.read_text(encoding="utf-8").strip() if key_path.exists() else ""

    return setup_key, created


def lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def open_when_ready(url: str) -> None:
    for _ in range(40):
        try:
            urllib.request.urlopen(url + "/health", timeout=1).close()
            webbrowser.open(url)
            return
        except Exception:
            time.sleep(0.25)


def classync_is_running(url: str) -> bool:
    try:
        with urllib.request.urlopen(url + "/health", timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def port_is_available(port: int) -> bool:
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.bind(("0.0.0.0", port))
        return True
    except OSError:
        return False
    finally:
        probe.close()


def main() -> None:
    runtime_dir = data_directory()
    setup_key, created = ensure_configuration(runtime_dir)
    os.chdir(runtime_dir)
    port = int(os.environ.get("CLASSYNC_PORT", "8000"))
    os.environ["BACKEND_PORT"] = str(port)

    # Imports happen after chdir so relative database/upload paths live in the
    # user's application-data folder rather than beside the executable.
    import uvicorn
    from app.main import app

    local_url = f"http://localhost:{port}"
    network_url = f"http://{lan_ip()}:{port}"

    if not port_is_available(port):
        if classync_is_running(local_url):
            print(f"\nClassync is already running at {local_url}.")
            webbrowser.open(local_url)
            time.sleep(3)
            return
        raise RuntimeError(
            f"Classync cannot start because TCP port {port} is being used by another application. "
            "Close that application, then open Classync again."
        )

    print("\nClassync is starting...")
    print(f"This computer: {local_url}")
    print(f"Other devices: {network_url}")
    if created:
        print("\nA new superadmin setup key was generated:")
        print(setup_key)
        print(f"A copy is stored in: {runtime_dir / 'setup-key.txt'}")
    print("\nKeep this window open while Classync is in use.\n")

    threading.Thread(target=open_when_ready, args=(local_url,), daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        details = traceback.format_exc()
        error_path = data_directory() / "last-error.txt"
        error_path.write_text(details, encoding="utf-8")
        print("\nClassync could not start:\n")
        print(details)
        print(f"The error was saved to: {error_path}")
        try:
            input("\nPress Enter to close this window...")
        except EOFError:
            pass
