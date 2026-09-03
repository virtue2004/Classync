import socket


def get_lan_ip() -> str:
    """
    Returns this machine's LAN IP address (e.g. 192.168.1.20) — the one other
    devices on the same Wi-Fi/hotspot would use to reach it.

    This doesn't actually send any traffic: opening a UDP socket "toward" a
    public IP just makes the OS pick which local network interface it would
    use, which is exactly the address we want. Works without internet access.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"  # fallback if no network interface is up at all
    finally:
        s.close()


def build_join_url(backend_port: int, frontend_port: int) -> str:
    """
    A link that, when opened, lands a student straight on the login page with
    the server address already filled in — no IP address typing required.
    """
    ip = get_lan_ip()
    server_url = f"http://{ip}:{backend_port}"
    # The production frontend is served by FastAPI on the backend port. Keep
    # this parameter for compatibility with callers and old connection codes.
    return f"{server_url}/?server={server_url}"
