from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class MapLocation(BaseModel):
    latitude: float
    longitude: float
    accuracyMeters: Optional[float] = None

class MapIncident(BaseModel):
    id: str
    incidentType: str
    severity: str
    confidence: float
    timestamp: datetime
    location: MapLocation
    status: str
    deviceId: Optional[str] = None
    busId: Optional[str] = None
    routeId: Optional[str] = None

class MapIncidentResponse(BaseModel):
    items: List[MapIncident]
    total: int

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: int

class HeatmapResponse(BaseModel):
    items: List[HeatmapPoint]
