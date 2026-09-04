from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class AcceptedEvent(BaseModel):
    eventId: str
    status: str
    incidentId: Optional[str] = None
    deviceId: Optional[str] = None
    busId: Optional[str] = None
    routeId: Optional[str] = None

class DuplicateEvent(BaseModel):
    eventId: str
    status: str

class EventError(BaseModel):
    eventId: Optional[str] = None
    field: str
    message: str

class EventIngestResponse(BaseModel):
    success: bool
    accepted: List[AcceptedEvent]
    duplicates: List[DuplicateEvent]
    errors: List[EventError]

class EventIngestRequest(BaseModel):
    events: List[Dict[str, Any]]

class IncidentLocation(BaseModel):
    latitude: float
    longitude: float
    accuracyMeters: float

class IncidentResponse(BaseModel):
    id: str
    eventId: str
    incidentType: str
    severity: str
    confidence: float
    timestamp: datetime
    location: Optional[IncidentLocation] = None
    recordingId: Optional[str] = None
    status: str
    description: Optional[str] = None
    deviceId: Optional[str] = None
    busId: Optional[str] = None
    routeId: Optional[str] = None

class IncidentListResponse(BaseModel):
    items: List[IncidentResponse]
    total: int
    page: int
    pageSize: int

class IncidentUpdateRequest(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None

class IncidentEvidenceResponse(BaseModel):
    incidentId: str
    recordingId: Optional[str]
    hasRecording: bool
    recordingMetadata: Optional[dict] = None

class AlertResponse(BaseModel):
    id: str
    incidentId: str
    alertType: str
    severity: str
    message: str
    status: str
    createdAt: datetime

class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    pageSize: int

class AlertUpdateRequest(BaseModel):
    status: str
