from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.deps import get_db
from app.auth.deps import require_roles
from app.schemas.registry import (
    RouteResponse, RouteCreate, RouteUpdate,
    BusResponse, BusCreate, BusUpdate,
    DeviceResponse, DeviceCreate, DeviceUpdate
)
from app.schemas.device_auth import DeviceCredentialResponse
from app.services import registry as registry_service

router = APIRouter(prefix="/api/registry", tags=["Registry"])

READ_ROLES = ["admin", "traffic_authority", "municipal_authority"]
WRITE_ROLES = ["admin"]

# --- Routes ---

@router.get("/routes", response_model=List[RouteResponse], response_model_by_alias=True)
def get_routes(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(READ_ROLES))
):
    return registry_service.get_routes(db)

@router.get("/routes/{route_id}", response_model=RouteResponse, response_model_by_alias=True)
def get_route(
    route_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(READ_ROLES))
):
    return registry_service.get_route(db, route_id)

@router.post("/routes", response_model=RouteResponse, response_model_by_alias=True)
def create_route(
    route_in: RouteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    return registry_service.create_route(db, route_in)

@router.patch("/routes/{route_id}", response_model=RouteResponse, response_model_by_alias=True)
def update_route(
    route_id: str,
    route_in: RouteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    return registry_service.update_route(db, route_id, route_in)

# --- Buses ---

@router.get("/buses", response_model=List[BusResponse], response_model_by_alias=True)
def get_buses(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(READ_ROLES))
):
    return registry_service.get_buses(db)

@router.get("/buses/{bus_id}", response_model=BusResponse, response_model_by_alias=True)
def get_bus(
    bus_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(READ_ROLES))
):
    return registry_service.get_bus(db, bus_id)

@router.post("/buses", response_model=BusResponse, response_model_by_alias=True)
def create_bus(
    bus_in: BusCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    return registry_service.create_bus(db, bus_in)

@router.patch("/buses/{bus_id}", response_model=BusResponse, response_model_by_alias=True)
def update_bus(
    bus_id: str,
    bus_in: BusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    return registry_service.update_bus(db, bus_id, bus_in)

# --- Devices ---

@router.get("/devices", response_model=List[DeviceResponse], response_model_by_alias=True)
def get_devices(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(READ_ROLES))
):
    return registry_service.get_devices(db)

@router.get("/devices/{device_id}", response_model=DeviceResponse, response_model_by_alias=True)
def get_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(READ_ROLES))
):
    device = registry_service.get_device(db, device_id)
    return registry_service._device_to_response(device)

@router.post("/devices", response_model=DeviceResponse, response_model_by_alias=True)
def create_device(
    device_in: DeviceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    return registry_service.create_device(db, device_in)

@router.patch("/devices/{device_id}", response_model=DeviceResponse, response_model_by_alias=True)
def update_device(
    device_id: str,
    device_in: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    device = registry_service.update_device(db, device_id, device_in)
    return registry_service._device_to_response(device)


@router.post(
    "/devices/{device_id}/credentials",
    response_model=DeviceCredentialResponse,
    summary="Generate device API key (admin only)",
)
def generate_device_credentials(
    device_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(WRITE_ROLES))
):
    """
    Generate (or regenerate) a device API key.

    - Returns the plaintext key **exactly once** — store it securely.
    - The backend only retains a bcrypt hash; the plaintext is irrecoverable.
    - Regenerating invalidates the previous key immediately.
    """
    device_identifier, plaintext_key = registry_service.generate_device_credentials(db, device_id)
    return DeviceCredentialResponse(deviceId=device_identifier, apiKey=plaintext_key)
