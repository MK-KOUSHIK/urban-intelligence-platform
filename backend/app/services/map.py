from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime
from app.models.incidents import Incident
from app.schemas.map import (
    MapLocation,
    MapIncident,
    MapIncidentResponse,
    HeatmapPoint,
    HeatmapResponse
)

def _build_map_query(
    db: Session,
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    incident_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    bus_id: Optional[str] = None,
    route_id: Optional[str] = None
):
    # Exclude incidents with null locations
    query = db.query(Incident).filter(
        Incident.latitude.isnot(None),
        Incident.longitude.isnot(None)
    )
    
    # Bounding box filters
    query = query.filter(Incident.latitude >= min_lat)
    query = query.filter(Incident.latitude <= max_lat)
    query = query.filter(Incident.longitude >= min_lon)
    query = query.filter(Incident.longitude <= max_lon)
    
    # Optional filters
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    if from_date:
        query = query.filter(Incident.timestamp >= from_date)
    if to_date:
        query = query.filter(Incident.timestamp <= to_date)
    if device_id:
        query = query.filter(Incident.device_id == device_id)
    if bus_id:
        query = query.filter(Incident.bus_id == bus_id)
    if route_id:
        query = query.filter(Incident.route_id == route_id)
        
    return query

def get_map_incidents(
    db: Session,
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    incident_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    bus_id: Optional[str] = None,
    route_id: Optional[str] = None,
    limit: int = 1000
) -> MapIncidentResponse:
    
    query = _build_map_query(
        db=db,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        incident_type=incident_type,
        severity=severity,
        status=status,
        from_date=from_date,
        to_date=to_date,
        device_id=device_id,
        bus_id=bus_id,
        route_id=route_id,
    )
    
    # We only need the specific fields for map incidents, but querying the whole 
    # object is fine since we aren't joining large relations.
    query = query.order_by(desc(Incident.timestamp), desc(Incident.id))
    incidents = query.limit(limit).all()
    
    items = []
    for inc in incidents:
        loc = MapLocation(
            latitude=inc.latitude,  # type: ignore (guaranteed not None by filter)
            longitude=inc.longitude, # type: ignore
            accuracyMeters=inc.accuracy_meters
        )
        items.append(MapIncident(
            id=inc.incident_id,
            incidentType=inc.incident_type,
            severity=inc.severity,
            confidence=inc.confidence,
            timestamp=inc.timestamp,
            location=loc,
            status=inc.status,
            deviceId=inc.device_id,
            busId=inc.bus_id,
            routeId=inc.route_id,
        ))
        
    return MapIncidentResponse(items=items, total=len(items))

def get_heatmap_points(
    db: Session,
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    incident_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = 5000  # Heatmaps can typically handle more points
) -> HeatmapResponse:
    
    # For heatmap, we only need lat, lon, and severity
    query = db.query(Incident.latitude, Incident.longitude, Incident.severity).filter(
        Incident.latitude.isnot(None),
        Incident.longitude.isnot(None),
        Incident.latitude >= min_lat,
        Incident.latitude <= max_lat,
        Incident.longitude >= min_lon,
        Incident.longitude <= max_lon
    )
    
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    if from_date:
        query = query.filter(Incident.timestamp >= from_date)
    if to_date:
        query = query.filter(Incident.timestamp <= to_date)
        
    query = query.limit(limit)
    rows = query.all()
    
    severity_weights = {
        "low": 1,
        "medium": 2,
        "high": 3
    }
    
    items = []
    for lat, lon, sev in rows:
        weight = severity_weights.get(sev, 1)
        items.append(HeatmapPoint(
            latitude=lat,
            longitude=lon,
            weight=weight
        ))
        
    return HeatmapResponse(items=items)
