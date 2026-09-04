from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database.core import Base

def generate_uuid():
    return str(uuid.uuid4())

class Route(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    route_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationship
    buses = relationship("Bus", back_populates="route")

class Bus(Base):
    __tablename__ = "buses"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    bus_number = Column(String, unique=True, index=True, nullable=False)
    registration_number = Column(String, unique=True, index=True, nullable=False)
    operator = Column(String, nullable=False)
    route_id = Column(String, ForeignKey("routes.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    route = relationship("Route", back_populates="buses")
    devices = relationship("Device", back_populates="bus")


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    device_identifier = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)
    bus_id = Column(String, ForeignKey("buses.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Device authentication — never expose api_key_hash through API responses
    api_key_hash = Column(String, nullable=True)
    api_key_created_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    # relationships
    bus = relationship("Bus", back_populates="devices")
