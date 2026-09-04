from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException
from typing import List, Optional
import math

from app.models.recordings import Recording
from app.models.incidents import Incident
from app.schemas.recordings import RecordingCreate, RecordingUpdate, RecordingResponse
from app.schemas.api import IncidentResponse
from app.services.registry import resolve_device_identity
from app.services.incidents import _map_incident_to_response

def _map_recording_to_response(rec: Recording) -> RecordingResponse:
    return RecordingResponse(
        id=rec.id,
        recordingId=rec.recording_id,
        deviceId=rec.device_id,
        busId=rec.bus_id,
        routeId=rec.route_id,
        startTime=rec.start_time,
        endTime=rec.end_time,
        durationSeconds=rec.duration_seconds,
        fileSizeBytes=rec.file_size_bytes,
        filePath=rec.file_path,
        status=rec.status,
        createdAt=rec.created_at,
        updatedAt=rec.updated_at
    )

def create_recording(db: Session, recording_in: RecordingCreate) -> RecordingResponse:
    existing = db.query(Recording).filter(Recording.recording_id == recording_in.recordingId).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Recording with recordingId '{recording_in.recordingId}' already exists")

    bus_id = None
    route_id = None
    if recording_in.deviceId:
        identity = resolve_device_identity(db, recording_in.deviceId)
        bus_id = identity.bus_id
        route_id = identity.route_id

    db_rec = Recording(
        recording_id=recording_in.recordingId,
        device_id=recording_in.deviceId,
        bus_id=bus_id,
        route_id=route_id,
        start_time=recording_in.startTime,
        end_time=recording_in.endTime,
        duration_seconds=recording_in.durationSeconds,
        file_size_bytes=recording_in.fileSizeBytes,
        file_path=recording_in.filePath,
        status=recording_in.status if recording_in.status else "uploading"
    )
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)

    return _map_recording_to_response(db_rec)

def update_recording(db: Session, id: str, recording_in: RecordingUpdate) -> RecordingResponse:
    db_rec = db.query(Recording).filter(Recording.id == id).first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found")

    if recording_in.startTime is not None:
        db_rec.start_time = recording_in.startTime
    if recording_in.endTime is not None:
        db_rec.end_time = recording_in.endTime
    if recording_in.durationSeconds is not None:
        db_rec.duration_seconds = recording_in.durationSeconds
    if recording_in.fileSizeBytes is not None:
        db_rec.file_size_bytes = recording_in.fileSizeBytes
    if recording_in.filePath is not None:
        db_rec.file_path = recording_in.filePath
    if recording_in.status is not None:
        db_rec.status = recording_in.status

    db.commit()
    db.refresh(db_rec)

    return _map_recording_to_response(db_rec)

def get_recording(db: Session, id: str) -> RecordingResponse:
    db_rec = db.query(Recording).filter(Recording.id == id).first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found")
    return _map_recording_to_response(db_rec)

def get_recordings(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    device_id: Optional[str] = None,
    bus_id: Optional[str] = None,
    status: Optional[str] = None
) -> dict:
    query = db.query(Recording)

    if device_id:
        query = query.filter(Recording.device_id == device_id)
    if bus_id:
        query = query.filter(Recording.bus_id == bus_id)
    if status:
        query = query.filter(Recording.status == status)

    total = query.count()
    query = query.order_by(desc(Recording.created_at))
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": [_map_recording_to_response(item) for item in items],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": math.ceil(total / page_size) if page_size else 0
    }

def get_recording_incidents(db: Session, id: str, page: int = 1, page_size: int = 20) -> dict:
    db_rec = db.query(Recording).filter(Recording.id == id).first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found")

    query = db.query(Incident).filter(Incident.recording_id == db_rec.recording_id)
    total = query.count()
    query = query.order_by(desc(Incident.timestamp))
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": [_map_incident_to_response(item) for item in items],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": math.ceil(total / page_size) if page_size else 0
    }
