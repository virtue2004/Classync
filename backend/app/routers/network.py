import io
import qrcode
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, HTMLResponse

from app.config import settings
from app.network import get_lan_ip, build_join_url
from app.connection_code import encode_connection_code

router = APIRouter(tags=["network"])


@router.get("/network-info")
def network_info():
    """Machine-readable version, useful if you build a native app later."""
    ip = get_lan_ip()
    return {
        "instance_name": settings.INSTANCE_NAME,
        "lan_ip": ip,
        "server_url": f"http://{ip}:{settings.BACKEND_PORT}",
        "join_url": build_join_url(settings.BACKEND_PORT, settings.FRONTEND_PORT),
        "connection_code": encode_connection_code(ip, settings.BACKEND_PORT),
    }


@router.get("/qr")
def qr_code():
    """
    A scannable PNG of the join link. Point a browser at this directly
    (e.g. http://localhost:8000/qr) to grab the image, or use /join for a
    page designed to be displayed/projected in the classroom.
    """
    join_url = build_join_url(settings.BACKEND_PORT, settings.FRONTEND_PORT)
    img = qrcode.make(join_url)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")


@router.get("/join", response_class=HTMLResponse)
def join_page():
    """
    A big, simple page meant to be shown on the tutor's screen or projector.
    Students scan it with their phone's normal camera app — no app or typing
    required. Refresh this page if the machine's network changes.
    """
    join_url = build_join_url(settings.BACKEND_PORT, settings.FRONTEND_PORT)
    server_url = f"http://{get_lan_ip()}:{settings.BACKEND_PORT}"
    code = encode_connection_code(get_lan_ip(), settings.BACKEND_PORT)

    return f"""
    <html>
      <head>
        <title>Join {settings.INSTANCE_NAME}</title>
        <style>
          body {{
            font-family: sans-serif; text-align: center; background: #0d1117;
            color: white; padding: 3rem 1rem;
          }}
          h1 {{ color: #06b6d4; }}
          img {{ background: white; padding: 1rem; border-radius: 12px; margin: 1.5rem 0; }}
          .fallback {{ color: #9ca3af; font-size: 0.95rem; margin-top: 2rem; }}
          .code {{
            font-size: 1.8rem; font-weight: 700; letter-spacing: 0.15rem;
            background: #1f2937; color: #06b6d4; padding: 0.75rem 1.25rem;
            border-radius: 10px; display: inline-block; margin-top: 0.5rem;
          }}
          code {{ background: #1f2937; padding: 0.2rem 0.5rem; border-radius: 6px; }}
        </style>
      </head>
      <body>
        <h1>Join {settings.INSTANCE_NAME}</h1>
        <p><strong>On a phone:</strong> open your camera and point it at the code below.</p>
        <img src="/qr" width="280" height="280" alt="Scan to join" />

        <p class="fallback">
          <strong>On a laptop:</strong> open the app and type this connection code —
          no need to find an IP address.
        </p>
        <div class="code">{code}</div>

        <p class="fallback">
          Still stuck? Type this address into a browser directly:<br />
          <code>{server_url}</code>
        </p>
      </body>
    </html>
    """
