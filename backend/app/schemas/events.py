from pydantic import BaseModel, Field, field_validator, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum

class EventType(str, Enum):
    pothole = "pothole"
    missing_zebra_crossing = "missing_zebra_crossing"
    rash_driving = "rash_driving"
    vehicle_detection = "vehicle_detection"
    pedestrian_event = "pedestrian_event"
    anpr = "anpr"
    hit_and_run = "hit_and_run"
    traffic_anomaly = "traffic_anomaly"
    road_damage = "road_damage"
    waterlogging = "waterlogging"
    missing_sign = "missing_sign"
    pedestrian = "pedestrian"
    vehicle = "vehicle"
    other = "other"

class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class Status(str, Enum):
    new = "new"
    investigating = "investigating"
    resolved = "resolved"
    dismissed = "dismissed"

class Evidence(BaseModel):
    evidence_id: str
    url: str
    media_type: str
    timestamp: datetime

class Location(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    accuracy_meters: Optional[float] = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class BoundingBox(BaseModel):
    left: float = Field(ge=0.0, le=1.0)
    top: float = Field(ge=0.0, le=1.0)
    right: float = Field(ge=0.0, le=1.0)
    bottom: float = Field(ge=0.0, le=1.0)

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class AIEvent(BaseModel):
    event_id: Optional[str] = None
    event_type: EventType
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: datetime
    recording_id: Optional[str] = None
    location: Optional[Location] = None
    bounding_box: Optional[BoundingBox] = None
    received_at: Optional[datetime] = None

    # Original fields preserved
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    device_id: Optional[str] = None          # resolves to Device in registry
    bus_id: Optional[str] = None
    route_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    license_plate: Optional[str] = None
    plate_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    evidence_image: Optional[str] = None
    evidence_video: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @field_validator('event_type', mode='before')
    @classmethod
    def convert_event_type_to_lower(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v

class Incident(BaseModel):
    incident_id: str
    event_type: EventType
    severity: Severity = Severity.medium
    status: Status = Status.new
    title: str
    description: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    created_at: datetime
    updated_at: datetime
    events: List[AIEvent] = []
    evidence: List[Evidence] = []

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class Alert(BaseModel):
    alert_id: str
    incident_id: str
    severity: Severity
    message: str
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
