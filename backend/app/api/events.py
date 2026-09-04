from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.api import EventIngestRequest, EventIngestResponse
from app.database.deps import get_db
from app.services.events import process_events_batch
from app.auth.device_deps import get_authenticated_device
from app.models.registry import Device

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.post("", response_model=EventIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_events(
    request: EventIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    authenticated_device: Device = Depends(get_authenticated_device),
):
    """
    Ingest AI sensing events from an Android device.

    Authentication: X-Device-Key header required.
    The authenticated device identity is authoritative — payload deviceId must
    match (or be omitted) to prevent impersonation.
    """
    return process_events_batch(db, request.events, background_tasks, authenticated_device)
