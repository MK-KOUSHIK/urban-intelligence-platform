from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database.deps import get_db
from app.models.users import User
from app.auth.deps import require_roles
from app.schemas.api import IncidentListResponse, IncidentResponse, IncidentUpdateRequest, IncidentEvidenceResponse
from app.services.incidents import get_incidents, get_incident_by_id, update_incident, get_incident_evidence
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

@router.get("", response_model=IncidentListResponse)
def list_incidents(
    incidentType: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    deviceId: Optional[str] = Query(None),
    busId: Optional[str] = Query(None),
    routeId: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    """
    List incidents with optional filters and pagination.
    """
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=400, detail="from date cannot be after to date")
        
    return get_incidents(
        db=db,
        page=page,
        page_size=pageSize,
        incident_type=incidentType,
        severity=severity,
        status=status,
        from_date=from_date,
        to_date=to_date,
        device_id=deviceId,
        bus_id=busId,
        route_id=routeId,
    )

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    """
    Get a single incident by ID.
    """
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident_endpoint(
    incident_id: str,
    update_data: IncidentUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    """
    Update an incident's status and/or description.
    """
    try:
        incident = update_incident(
            db, 
            incident_id, 
            status=update_data.status, 
            description=update_data.description
        )
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
            
        background_tasks.add_task(
            manager.broadcast,
            {"type": "incident.updated", "data": incident.model_dump(mode='json')}
        )
        
        return incident
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/{incident_id}/evidence", response_model=IncidentEvidenceResponse)
def get_incident_evidence_endpoint(
    incident_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    """
    Get evidence (recording) metadata for a specific incident.
    """
    evidence = get_incident_evidence(db, incident_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Incident not found")
    return evidence
