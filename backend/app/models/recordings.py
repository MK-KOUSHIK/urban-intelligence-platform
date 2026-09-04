import uuid
from sqlalchemy import Column, String, DateTime, Integer, func
from app.database.core import Base

class Recording(Base):
    __tablename__ = "recordings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recording_id = Column(String, unique=True, index=True, nullable=False) # e.g. REC_001
    
    device_id = Column(String, index=True, nullable=True) # ID from payload
    bus_id = Column(String, index=True, nullable=True) # Resolved FK
    route_id = Column(String, index=True, nullable=True) # Resolved FK
    
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    file_size_bytes = Column(Integer, nullable=True)
    file_path = Column(String, nullable=True)
    status = Column(String, nullable=False, default="uploading") # uploading, available, archived, deleted
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
