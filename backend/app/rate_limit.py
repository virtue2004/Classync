from collections import defaultdict, deque
from time import monotonic
from fastapi import HTTPException, Request

_hits: dict[str, deque[float]] = defaultdict(deque)


def limit(request: Request, bucket: str, maximum: int, window_seconds: int = 60) -> None:
    key = f"{bucket}:{request.client.host if request.client else 'unknown'}"
    now = monotonic()
    hits = _hits[key]
    while hits and hits[0] <= now - window_seconds:
        hits.popleft()
    if len(hits) >= maximum:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute and try again.")
    hits.append(now)
