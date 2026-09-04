from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, ForeignKey
from datetime import datetime, timezone
import uuid
from app.database.core import Base

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String, ForeignKey("incidents.incident_id"), index=True, nullable=False)
    alert_type = Column(String, index=True, nullable=False)
    severity = Column(String, index=True, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default="unread", index=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('incident_id', 'alert_type', name='uq_incident_alert_type'),
    )
