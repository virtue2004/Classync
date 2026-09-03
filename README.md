# Classync

Classync is a secure, local-network file-sharing application for classrooms,
training sessions, and small teams. Tutors can share files over Wi-Fi without
requiring recipients to create accounts or use an internet connection.

## Highlights

- React + TypeScript frontend, built with Vite
- FastAPI + SQLite backend
- Secure device pairing with server-issued credentials
- Owner setup and recovery protected by a host-only setup key
- QR codes and compact connection codes for joining a LAN session
- Public receive flow with secure, cryptographically generated share codes
- File type checks, per-file and batch upload limits, and download throttling
- Automatic removal of uploaded files when shares close or expire
- Installable PWA interface

## Architecture

```
frontend/       React client and PWA assets
backend/app/    FastAPI routes, security, storage, and database models
backend/tests/  Automated backend tests
```

For production, FastAPI serves the built frontend from `frontend/dist`, so the
application runs on one origin and does not depend on Vite's development server.

## Run locally

Prerequisites: Python 3.11+ and Node.js LTS.

```powershell
cd academy-share
.\start-classync.ps1
```

On the first run, the script creates `backend/.env` and prints an
`OWNER_SETUP_KEY`. Keep the key private; enter it in the browser to appoint the
first owner device. The application opens at `http://localhost:8000`.

## Test

```powershell
cd backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Build the frontend manually with:

```powershell
cd frontend
npm.cmd run build
```

## Security notes

The intended deployment is a trusted local network. For deployments where LAN
traffic could be observed, configure HTTPS with a trusted local certificate;
device credentials should not be sent over untrusted HTTP networks.

Runtime data, upload files, virtual environments, frontend dependencies, build
artifacts, and `.env` credentials are excluded from version control.

## License

Add a license before distributing this project publicly.
