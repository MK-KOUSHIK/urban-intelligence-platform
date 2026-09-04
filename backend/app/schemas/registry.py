from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

# --- Route Schemas ---
class RouteCreate(BaseModel):
    routeNumber: str
    name: str
    origin: str
    destination: str
    isActive: bool = True

    model_config = ConfigDict(populate_by_name=True)

class RouteUpdate(BaseModel):
    routeNumber: Optional[str] = None
    name: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)

class RouteResponse(BaseModel):
    id: str
    route_number: str = Field(alias="routeNumber")
    name: str
    origin: str
    destination: str
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# --- Bus Schemas ---
class BusCreate(BaseModel):
    busNumber: str
    registrationNumber: str
    operator: str
    routeId: Optional[str] = None
    isActive: bool = True

    model_config = ConfigDict(populate_by_name=True)

class BusUpdate(BaseModel):
    busNumber: Optional[str] = None
    registrationNumber: Optional[str] = None
    operator: Optional[str] = None
    routeId: Optional[str] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)

class BusResponse(BaseModel):
    id: str
    bus_number: str = Field(alias="busNumber")
    registration_number: str = Field(alias="registrationNumber")
    operator: str
    route_id: Optional[str] = Field(None, alias="routeId")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# --- Device Schemas ---
class DeviceCreate(BaseModel):
    deviceIdentifier: str
    name: str
    deviceType: str
    busId: Optional[str] = None
    isActive: bool = True

    model_config = ConfigDict(populate_by_name=True)

class DeviceUpdate(BaseModel):
    deviceIdentifier: Optional[str] = None
    name: Optional[str] = None
    deviceType: Optional[str] = None
    busId: Optional[str] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)

class DeviceResponse(BaseModel):
    id: str
    device_identifier: str = Field(alias="deviceIdentifier")
    name: str
    device_type: str = Field(alias="deviceType")
    bus_id: Optional[str] = Field(None, alias="busId")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    # Auth status (safe — never exposes key or hash)
    has_credentials: bool = Field(False, alias="hasCredentials")
    last_seen_at: Optional[datetime] = Field(None, alias="lastSeenAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

