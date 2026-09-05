import math
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime
from app.models.incidents import Incident
from app.schemas.api import IncidentResponse, IncidentLocation, IncidentListResponse, IncidentEvidenceResponse
from app.models.recordings import Recording

def get_incidents(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    incident_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    bus_id: Optional[str] = None,
    route_id: Optional[str] = None
) -> IncidentListResponse:
    
    query = db.query(Incident)
    
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    if from_date:
        query = query.filter(Incident.timestamp >= from_date)
    if to_date:
        query = query.filter(Incident.timestamp <= to_date)
    if device_id:
        query = query.filter(Incident.device_id == device_id)
    if bus_id:
        query = query.filter(Incident.bus_id == bus_id)
    if route_id:
        query = query.filter(Incident.route_id == route_id)
        
    total = query.count()
    
    # Deterministic sorting
    query = query.order_by(desc(Incident.timestamp), desc(Incident.id))
    
    # Pagination
    offset = (page - 1) * page_size
    incidents = query.offset(offset).limit(page_size).all()
    
    items = []
    for inc in incidents:
        items.append(_map_incident_to_response(inc))
        
    return IncidentListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=math.ceil(total / page_size) if page_size else 0
    )

def get_incident_by_id(db: Session, incident_id: str) -> Optional[IncidentResponse]:
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        return None
    return _map_incident_to_response(inc)

def _map_incident_to_response(inc: Incident) -> IncidentResponse:
    location = None
    if inc.latitude is not None and inc.longitude is not None and inc.accuracy_meters is not None:
        location = IncidentLocation(
            latitude=inc.latitude,
            longitude=inc.longitude,
            accuracyMeters=inc.accuracy_meters
        )
        
    return IncidentResponse(
        id=inc.incident_id,
        eventId=inc.event_id,
        incidentType=inc.incident_type,
        severity=inc.severity,
        confidence=inc.confidence,
        timestamp=inc.timestamp,
        location=location,
        recordingId=inc.recording_id,
        status=inc.status,
        description=inc.description,
        deviceId=inc.device_id,
        busId=inc.bus_id,
        routeId=inc.route_id,
    )

def validate_status_transition(current: str, requested: str) -> bool:
    if current == requested:
        return True
    
    valid_transitions = {
        "open": ["acknowledged", "resolved"],
        "acknowledged": ["resolved"],
        "resolved": []
    }
    
    allowed = valid_transitions.get(current, [])
    return requested in allowed

def update_incident(db: Session, incident_id: str, status: Optional[str] = None, description: Optional[str] = None) -> Optional[IncidentResponse]:
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        return None
        
    if status is not None:
        if not validate_status_transition(inc.status, status):
            raise ValueError("Invalid incident status transition")
        inc.status = status
        
    if description is not None:
        inc.description = description
        
    db.commit()
    db.refresh(inc)
    
    return _map_incident_to_response(inc)

def get_incident_evidence(db: Session, incident_id: str) -> Optional[IncidentEvidenceResponse]:
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        return None
        
    has_recording = inc.recording_id is not None
    recording_metadata = None
    
    if has_recording:
        rec = db.query(Recording).filter(Recording.recording_id == inc.recording_id).first()
        if rec:
            recording_metadata = {
                "id": rec.id,
                "recordingId": rec.recording_id,
                "status": rec.status,
                "startTime": rec.start_time.isoformat() if rec.start_time else None,
                "endTime": rec.end_time.isoformat() if rec.end_time else None,
                "durationSeconds": rec.duration_seconds,
                "fileSizeBytes": rec.file_size_bytes,
                "filePath": rec.file_path,
                "deviceId": rec.device_id,
                "busId": rec.bus_id,
                "routeId": rec.route_id
            }
            
    return IncidentEvidenceResponse(
        incidentId=inc.incident_id,
        recordingId=inc.recording_id,
        hasRecording=has_recording,
        recordingMetadata=recording_metadata
    )
