from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.database import Base, engine, run_migrations
from app.config import settings
from app.routers import network, shares, devices

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title=f"{settings.INSTANCE_NAME} - LAN File Share")

# Production clients are served by this application and therefore need no
# CORS.  Explicit origins support the optional Vite development server only.
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Device-Id", "X-Device-Token"],
    )

app.include_router(network.router)
app.include_router(shares.router)
app.include_router(devices.router)


@app.get("/health")
def health():
    return {"status": "ok", "instance": settings.INSTANCE_NAME}


DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    """Serve the production SPA and its root-level PWA assets."""
    candidate = (DIST_DIR / path).resolve()
    if DIST_DIR.exists() and candidate.is_relative_to(DIST_DIR) and candidate.is_file():
        return FileResponse(candidate)
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Frontend build not found. Run npm run build in frontend.")
