from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database.core import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True, nullable=False)
    event_type = Column(String, index=True, nullable=False)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    received_at = Column(DateTime, index=True, nullable=True)
    recording_id = Column(String, index=True, nullable=True)
    
    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    accuracy_meters = Column(Float, nullable=True)
    
    # BoundingBox
    bbox_left = Column(Float, nullable=True)
    bbox_top = Column(Float, nullable=True)
    bbox_right = Column(Float, nullable=True)
    bbox_bottom = Column(Float, nullable=True)
    
    # Original Metadata
    device_id = Column(String, index=True, nullable=True)
    bus_id = Column(String, index=True, nullable=True)
    route_id = Column(String, index=True, nullable=True)
    vehicle_id = Column(String, nullable=True)
    license_plate = Column(String, nullable=True)
    plate_confidence = Column(Float, nullable=True)
    evidence_image = Column(String, nullable=True)
    evidence_video = Column(String, nullable=True)
    description = Column(String, nullable=True)
