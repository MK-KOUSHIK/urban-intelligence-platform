from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
import uuid
from app.database.core import Base

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, unique=True, index=True, nullable=False)
    incident_type = Column(String, index=True, nullable=False)
    severity = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    
    # Location
    latitude = Column(Float, index=True, nullable=True)
    longitude = Column(Float, index=True, nullable=True)
    accuracy_meters = Column(Float, nullable=True)
    
    # Optional references
    recording_id = Column(String, index=True, nullable=True)

    # Fleet identity (resolved from registry, nullable for backward compat)
    device_id = Column(String, index=True, nullable=True)
    bus_id = Column(String, index=True, nullable=True)
    route_id = Column(String, index=True, nullable=True)
    
    # BoundingBox
    bbox_left = Column(Float, nullable=True)
    bbox_top = Column(Float, nullable=True)
    bbox_right = Column(Float, nullable=True)
    bbox_bottom = Column(Float, nullable=True)
    
    status = Column(String, default="open", nullable=False)
    description = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
