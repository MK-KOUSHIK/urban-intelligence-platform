from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database.deps import get_db
from app.models.registry import Device
from app.auth.security import verify_device_api_key


def get_authenticated_device(
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    db: Session = Depends(get_db),
) -> Device:
    """
    Authenticate a device via the X-Device-Key header.

    Rules:
    - Missing header          → 401
    - Key does not match any device → 401 (generic, no detail leakage)
    - Matched device inactive → 403
    - Success                 → returns Device ORM object

    Never reveals whether a key exists but is wrong vs. totally unknown.
    """
    if not x_device_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device authentication required. Provide X-Device-Key header.",
            headers={"WWW-Authenticate": "X-Device-Key"},
        )

    # Scan all devices that have a credential. For hackathon scale this is fine.
    # For production, add a key-prefix lookup to narrow the candidate set.
    devices_with_keys = (
        db.query(Device)
        .filter(Device.api_key_hash.isnot(None))
        .all()
    )

    matched: Optional[Device] = None
    for device in devices_with_keys:
        if verify_device_api_key(x_device_key, device.api_key_hash):
            matched = device
            break

    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device credentials.",
            headers={"WWW-Authenticate": "X-Device-Key"},
        )

    if not matched.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device is inactive and cannot submit data.",
        )

    return matched
