from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database.deps import get_db
from app.auth.deps import require_roles
from app.models.users import User
from app.schemas.map import MapIncidentResponse, HeatmapResponse
from app.services import map as map_service

router = APIRouter()

map_roles = ["admin", "traffic_authority", "municipal_authority"]

def validate_bounding_box(minLat: float, maxLat: float, minLon: float, maxLon: float):
    if minLat < -90 or maxLat > 90 or minLat > 90 or maxLat < -90:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude must be between -90 and 90"
        )
    if minLon < -180 or maxLon > 180 or minLon > 180 or maxLon < -180:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Longitude must be between -180 and 180"
        )
    if minLat > maxLat:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="minLatitude cannot be greater than maxLatitude"
        )
    if minLon > maxLon:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="minLongitude cannot be greater than maxLongitude"
        )

@router.get("/incidents", response_model=MapIncidentResponse)
def get_map_incidents(
    minLatitude: float = Query(...),
    maxLatitude: float = Query(...),
    minLongitude: float = Query(...),
    maxLongitude: float = Query(...),
    incidentType: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    deviceId: Optional[str] = Query(None),
    busId: Optional[str] = Query(None),
    routeId: Optional[str] = Query(None),
    limit: int = Query(1000, le=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(map_roles))
):
    validate_bounding_box(minLatitude, maxLatitude, minLongitude, maxLongitude)
    
    return map_service.get_map_incidents(
        db=db,
        min_lat=minLatitude,
        max_lat=maxLatitude,
        min_lon=minLongitude,
        max_lon=maxLongitude,
        incident_type=incidentType,
        severity=severity,
        status=status,
        from_date=from_dt,
        to_date=to_dt,
        device_id=deviceId,
        bus_id=busId,
        route_id=routeId,
        limit=limit
    )

@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    minLatitude: float = Query(...),
    maxLatitude: float = Query(...),
    minLongitude: float = Query(...),
    maxLongitude: float = Query(...),
    incidentType: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(5000, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(map_roles))
):
    validate_bounding_box(minLatitude, maxLatitude, minLongitude, maxLongitude)
    
    return map_service.get_heatmap_points(
        db=db,
        min_lat=minLatitude,
        max_lat=maxLatitude,
        min_lon=minLongitude,
        max_lon=maxLongitude,
        incident_type=incidentType,
        severity=severity,
        status=status,
        from_date=from_dt,
        to_date=to_dt,
        limit=limit
    )
