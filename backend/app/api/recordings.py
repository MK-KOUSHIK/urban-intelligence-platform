from fastapi import APIRouter, Depends, Query, BackgroundTasks, Header, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.database.deps import get_db
from app.auth.deps import get_optional_current_user
from app.auth.device_deps import get_authenticated_device
from app.schemas.recordings import RecordingCreate, RecordingUpdate, RecordingResponse
from app.services import recordings as recording_service
from app.services.websocket_manager import manager
from app.models.registry import Device
from app.models.users import User

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

async def broadcast_recording(action: str, recording: RecordingResponse):
    payload = {
        "type": f"recording.{action}",
        "data": recording.model_dump(mode="json")
    }
    await manager.broadcast(payload)


def _resolve_recording_auth(
    x_device_key: Optional[str],
    current_user: Optional[User],
    db: Session,
) -> Optional[Device]:
    """
    Resolve the authentication context for POST /api/recordings.

    Priority:
      1. X-Device-Key present → device auth path
      2. JWT admin present    → admin path (returns None device)
      3. Neither              → 401

    Returns:
      Device ORM object if authenticated via X-Device-Key
      None if authenticated via admin JWT
      Raises HTTPException if neither credential is valid.
    """
    if x_device_key:
        # Import here to avoid circular; delegate to the standard dependency logic inline
        from app.auth.security import verify_device_api_key
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

    if current_user is not None and current_user.role == "admin":
        return None  # Admin JWT — no device object

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required: provide X-Device-Key (device) or admin JWT.",
    )


@router.post("", response_model=RecordingResponse)
def create_recording(
    recording_in: RecordingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Create recording metadata.

    Auth: Admin JWT **or** X-Device-Key (Android device).
    Device-created recordings must not supply a deviceId belonging to another device.
    """
    auth_device = _resolve_recording_auth(x_device_key, current_user, db)

    if auth_device is not None:
        # Device-authenticated path: enforce identity
        payload_device_id = recording_in.deviceId
        if payload_device_id and payload_device_id != auth_device.device_identifier:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"deviceId '{payload_device_id}' does not match authenticated device "
                    f"'{auth_device.device_identifier}'. Impersonation rejected."
                ),
            )
        # Fill in deviceId from authenticated device if not supplied
        if not payload_device_id:
            recording_in = recording_in.model_copy(update={"deviceId": auth_device.device_identifier})

    recording = recording_service.create_recording(db, recording_in)

    # Update last_seen_at for the device
    if auth_device is not None:
        auth_device.last_seen_at = datetime.now(timezone.utc)
        db.commit()

    background_tasks.add_task(broadcast_recording, "created", recording)
    return recording


@router.get("", dependencies=[Depends(get_optional_current_user)])
def list_recordings(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    deviceId: Optional[str] = None,
    busId: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # Require at least one valid auth (JWT any role is fine for reads)
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return recording_service.get_recordings(db, page, pageSize, deviceId, busId, status_filter)


@router.get("/{id}", response_model=RecordingResponse)
def get_recording(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return recording_service.get_recording(db, id)


@router.patch("/{id}", response_model=RecordingResponse)
def update_recording(
    id: str,
    recording_in: RecordingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Admin-only PATCH. Android devices cannot modify recordings via this endpoint."""
    if current_user is None or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin may update recording metadata.",
        )
    recording = recording_service.update_recording(db, id, recording_in)
    background_tasks.add_task(broadcast_recording, "updated", recording)
    return recording


@router.get("/{id}/incidents")
def list_recording_incidents(
    id: str,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return recording_service.get_recording_incidents(db, id, page, pageSize)
