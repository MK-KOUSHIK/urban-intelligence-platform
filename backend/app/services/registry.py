from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from typing import List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone

from app.models.registry import Route, Bus, Device
from app.schemas.registry import RouteCreate, RouteUpdate, BusCreate, BusUpdate, DeviceCreate, DeviceUpdate, DeviceResponse
from app.auth.security import generate_device_api_key, hash_device_api_key


# ---------------------------------------------------------------------------
# Device Identity Resolution
# ---------------------------------------------------------------------------

@dataclass
class ResolvedIdentity:
    """Result of resolving a deviceId through the fleet registry."""
    device_id: str
    bus_id: Optional[str]
    route_id: Optional[str]


def resolve_device_identity(db: Session, device_identifier: str) -> ResolvedIdentity:
    """
    Resolve a device_identifier through the registry chain:
        Device → Bus → Route

    Cases:
      A: active device + active bus + active route  → full resolution
      B: active device, no bus                       → device_id only
      C: active device + active bus, no route        → device_id + bus_id
      D: unknown device_identifier                   → 422
      E: inactive device                             → 422
      F: device assigned to inactive bus             → 422
      G: bus assigned to inactive route              → 422
    """
    # Look up device
    device = db.query(Device).filter(Device.device_identifier == device_identifier).first()

    # Case D — unknown device
    if device is None:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown deviceId '{device_identifier}'. Register the device first."
        )

    # Case E — inactive device
    if not device.is_active:
        raise HTTPException(
            status_code=422,
            detail=f"Device '{device_identifier}' is inactive and cannot submit events."
        )

    # Case B — no bus assigned
    if device.bus_id is None:
        return ResolvedIdentity(device_id=device.device_identifier, bus_id=None, route_id=None)

    # Resolve bus
    bus = db.query(Bus).filter(Bus.id == device.bus_id).first()

    # Case F — bus is inactive
    if bus is None or not bus.is_active:
        raise HTTPException(
            status_code=422,
            detail=f"Device '{device_identifier}' is assigned to an inactive or missing bus."
        )

    # Case C — no route assigned
    if bus.route_id is None:
        return ResolvedIdentity(device_id=device.device_identifier, bus_id=bus.id, route_id=None)

    # Resolve route
    route = db.query(Route).filter(Route.id == bus.route_id).first()

    # Case G — route is inactive
    if route is None or not route.is_active:
        raise HTTPException(
            status_code=422,
            detail=f"Bus '{bus.bus_number}' is assigned to an inactive or missing route."
        )

    # Case A — full resolution
    return ResolvedIdentity(device_id=device.device_identifier, bus_id=bus.id, route_id=route.id)


# --- Route Services ---

def get_routes(db: Session) -> List[Route]:
    return db.query(Route).all()

def get_route(db: Session, route_id: str) -> Route:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

def create_route(db: Session, route_in: RouteCreate) -> Route:
    existing = db.query(Route).filter(Route.route_number == route_in.routeNumber).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Route with number '{route_in.routeNumber}' already exists")

    db_route = Route(
        route_number=route_in.routeNumber,
        name=route_in.name,
        origin=route_in.origin,
        destination=route_in.destination,
        is_active=route_in.isActive,
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route

def update_route(db: Session, route_id: str, route_in: RouteUpdate) -> Route:
    db_route = get_route(db, route_id)

    if route_in.routeNumber is not None and route_in.routeNumber != db_route.route_number:
        existing = db.query(Route).filter(Route.route_number == route_in.routeNumber).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Route with number '{route_in.routeNumber}' already exists")

    if route_in.routeNumber is not None:
        db_route.route_number = route_in.routeNumber
    if route_in.name is not None:
        db_route.name = route_in.name
    if route_in.origin is not None:
        db_route.origin = route_in.origin
    if route_in.destination is not None:
        db_route.destination = route_in.destination
    if route_in.isActive is not None:
        db_route.is_active = route_in.isActive

    db.commit()
    db.refresh(db_route)
    return db_route


# --- Bus Services ---

def get_buses(db: Session) -> List[Bus]:
    return db.query(Bus).all()

def get_bus(db: Session, bus_id: str) -> Bus:
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus

def create_bus(db: Session, bus_in: BusCreate) -> Bus:
    # Check uniqueness
    dup_num = db.query(Bus).filter(Bus.bus_number == bus_in.busNumber).first()
    if dup_num:
        raise HTTPException(status_code=409, detail=f"Bus with number '{bus_in.busNumber}' already exists")
    dup_reg = db.query(Bus).filter(Bus.registration_number == bus_in.registrationNumber).first()
    if dup_reg:
        raise HTTPException(status_code=409, detail=f"Bus with registration '{bus_in.registrationNumber}' already exists")

    # Validate routeId FK
    if bus_in.routeId:
        route = db.query(Route).filter(Route.id == bus_in.routeId).first()
        if not route:
            raise HTTPException(status_code=404, detail=f"Route with id '{bus_in.routeId}' not found")

    db_bus = Bus(
        bus_number=bus_in.busNumber,
        registration_number=bus_in.registrationNumber,
        operator=bus_in.operator,
        route_id=bus_in.routeId,
        is_active=bus_in.isActive,
    )
    db.add(db_bus)
    db.commit()
    db.refresh(db_bus)
    return db_bus

def update_bus(db: Session, bus_id: str, bus_in: BusUpdate) -> Bus:
    db_bus = get_bus(db, bus_id)

    if bus_in.busNumber is not None and bus_in.busNumber != db_bus.bus_number:
        dup = db.query(Bus).filter(Bus.bus_number == bus_in.busNumber).first()
        if dup:
            raise HTTPException(status_code=409, detail=f"Bus with number '{bus_in.busNumber}' already exists")

    if bus_in.registrationNumber is not None and bus_in.registrationNumber != db_bus.registration_number:
        dup = db.query(Bus).filter(Bus.registration_number == bus_in.registrationNumber).first()
        if dup:
            raise HTTPException(status_code=409, detail=f"Bus with registration '{bus_in.registrationNumber}' already exists")

    if bus_in.routeId is not None and bus_in.routeId != db_bus.route_id:
        route = db.query(Route).filter(Route.id == bus_in.routeId).first()
        if not route:
            raise HTTPException(status_code=404, detail=f"Route with id '{bus_in.routeId}' not found")

    if bus_in.busNumber is not None:
        db_bus.bus_number = bus_in.busNumber
    if bus_in.registrationNumber is not None:
        db_bus.registration_number = bus_in.registrationNumber
    if bus_in.operator is not None:
        db_bus.operator = bus_in.operator
    if bus_in.routeId is not None:
        db_bus.route_id = bus_in.routeId
    if bus_in.isActive is not None:
        db_bus.is_active = bus_in.isActive

    db.commit()
    db.refresh(db_bus)
    return db_bus


# --- Device Services ---

def get_devices(db: Session) -> List[Device]:
    return db.query(Device).all()

def get_device(db: Session, device_id: str) -> Device:
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

def create_device(db: Session, device_in: DeviceCreate) -> Device:
    existing = db.query(Device).filter(Device.device_identifier == device_in.deviceIdentifier).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Device with identifier '{device_in.deviceIdentifier}' already exists")

    if device_in.busId:
        bus = db.query(Bus).filter(Bus.id == device_in.busId).first()
        if not bus:
            raise HTTPException(status_code=404, detail=f"Bus with id '{device_in.busId}' not found")

    db_device = Device(
        device_identifier=device_in.deviceIdentifier,
        name=device_in.name,
        device_type=device_in.deviceType,
        bus_id=device_in.busId,
        is_active=device_in.isActive,
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def update_device(db: Session, device_id: str, device_in: DeviceUpdate) -> Device:
    db_device = get_device(db, device_id)

    if device_in.deviceIdentifier is not None and device_in.deviceIdentifier != db_device.device_identifier:
        existing = db.query(Device).filter(Device.device_identifier == device_in.deviceIdentifier).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Device with identifier '{device_in.deviceIdentifier}' already exists")

    if device_in.busId is not None and device_in.busId != db_device.bus_id:
        bus = db.query(Bus).filter(Bus.id == device_in.busId).first()
        if not bus:
            raise HTTPException(status_code=404, detail=f"Bus with id '{device_in.busId}' not found")

    if device_in.deviceIdentifier is not None:
        db_device.device_identifier = device_in.deviceIdentifier
    if device_in.name is not None:
        db_device.name = device_in.name
    if device_in.deviceType is not None:
        db_device.device_type = device_in.deviceType
    if device_in.busId is not None:
        db_device.bus_id = device_in.busId
    if device_in.isActive is not None:
        db_device.is_active = device_in.isActive

    db.commit()
    db.refresh(db_device)
    return db_device


# ---------------------------------------------------------------------------
# Device Credential Management
# ---------------------------------------------------------------------------

def generate_device_credentials(db: Session, device_id: str) -> Tuple[str, str]:
    """
    Generate a new API key for a device.

    Returns (device_identifier, plaintext_key).
    The plaintext key is NOT stored — only the bcrypt hash is persisted.
    Calling this invalidates any previously issued key.
    """
    db_device = db.query(Device).filter(
        (Device.id == device_id) | (Device.device_identifier == device_id)
    ).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")

    plaintext_key = generate_device_api_key()
    db_device.api_key_hash = hash_device_api_key(plaintext_key)
    db_device.api_key_created_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_device)

    return db_device.device_identifier, plaintext_key


def _device_to_response(device: Device) -> DeviceResponse:
    """Map Device ORM → DeviceResponse, computing has_credentials safely."""
    return DeviceResponse(
        id=device.id,
        deviceIdentifier=device.device_identifier,
        name=device.name,
        deviceType=device.device_type,
        busId=device.bus_id,
        isActive=device.is_active,
        createdAt=device.created_at,
        updatedAt=device.updated_at,
        hasCredentials=device.api_key_hash is not None,
        lastSeenAt=device.last_seen_at,
    )
