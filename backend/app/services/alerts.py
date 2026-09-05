import math
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.models.alerts import Alert
from app.schemas.api import AlertListResponse, AlertResponse

def get_alerts(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None
) -> AlertListResponse:
    query = db.query(Alert)
    
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
        
    total = query.count()
    
    query = query.order_by(desc(Alert.created_at), desc(Alert.id))
    
    offset = (page - 1) * page_size
    alerts = query.offset(offset).limit(page_size).all()
    
    items = []
    for alert in alerts:
        items.append(_map_alert_to_response(alert))
        
    return AlertListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=math.ceil(total / page_size) if page_size else 0
    )

def validate_alert_status_transition(current: str, requested: str) -> bool:
    if current == requested:
        return True
        
    valid_transitions = {
        "unread": ["acknowledged", "resolved"],
        "acknowledged": ["resolved"],
        "resolved": []
    }
    
    allowed = valid_transitions.get(current, [])
    return requested in allowed

def update_alert(db: Session, alert_id: str, status: str) -> Optional[AlertResponse]:
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        return None
        
    if not validate_alert_status_transition(alert.status, status):
        raise ValueError("Invalid alert status transition")
        
    alert.status = status
    db.commit()
    db.refresh(alert)
    
    return _map_alert_to_response(alert)

def _map_alert_to_response(alert: Alert) -> AlertResponse:
    return AlertResponse(
        id=alert.alert_id,
        incidentId=alert.incident_id,
        alertType=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        status=alert.status,
        createdAt=alert.created_at
    )
