from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.models.incidents import Incident
from app.models.alerts import Alert

def get_summary_stats(db: Session, from_dt: Optional[datetime] = None, to_dt: Optional[datetime] = None) -> Dict[str, int]:
    incident_query = db.query(
        func.count(Incident.id).label("total_incidents"),
        func.count(case((Incident.status == "open", 1))).label("open_incidents"),
        func.count(case((Incident.status == "acknowledged", 1))).label("acknowledged_incidents"),
        func.count(case((Incident.status == "resolved", 1))).label("resolved_incidents"),
        func.count(case((Incident.severity == "high", 1))).label("high_severity_incidents"),
        func.count(case((Incident.severity == "medium", 1))).label("medium_severity_incidents"),
        func.count(case((Incident.severity == "low", 1))).label("low_severity_incidents"),
    )
    
    if from_dt:
        incident_query = incident_query.filter(Incident.timestamp >= from_dt)
    if to_dt:
        incident_query = incident_query.filter(Incident.timestamp <= to_dt)
        
    incident_stats = incident_query.one()

    alert_query = db.query(
        func.count(Alert.id).label("total_alerts"),
        func.count(case((Alert.status == "unread", 1))).label("unread_alerts"),
        func.count(case((Alert.status == "acknowledged", 1))).label("acknowledged_alerts"),
        func.count(case((Alert.status == "resolved", 1))).label("resolved_alerts"),
    )
    
    if from_dt:
        alert_query = alert_query.filter(Alert.created_at >= from_dt)
    if to_dt:
        alert_query = alert_query.filter(Alert.created_at <= to_dt)
        
    alert_stats = alert_query.one()

    return {
        "total_incidents": incident_stats.total_incidents or 0,
        "open_incidents": incident_stats.open_incidents or 0,
        "acknowledged_incidents": incident_stats.acknowledged_incidents or 0,
        "resolved_incidents": incident_stats.resolved_incidents or 0,
        "high_severity_incidents": incident_stats.high_severity_incidents or 0,
        "medium_severity_incidents": incident_stats.medium_severity_incidents or 0,
        "low_severity_incidents": incident_stats.low_severity_incidents or 0,
        "total_alerts": alert_stats.total_alerts or 0,
        "unread_alerts": alert_stats.unread_alerts or 0,
        "acknowledged_alerts": alert_stats.acknowledged_alerts or 0,
        "resolved_alerts": alert_stats.resolved_alerts or 0,
    }

def get_incidents_by_type(db: Session, from_dt: Optional[datetime] = None, to_dt: Optional[datetime] = None) -> List[Dict[str, Any]]:
    query = db.query(Incident.incident_type, func.count(Incident.id).label("count"))
    
    if from_dt:
        query = query.filter(Incident.timestamp >= from_dt)
    if to_dt:
        query = query.filter(Incident.timestamp <= to_dt)
        
    results = query.group_by(Incident.incident_type).order_by(desc("count"), Incident.incident_type).all()
    
    return [{"incidentType": r.incident_type, "count": r.count} for r in results]

def get_incidents_by_severity(db: Session, from_dt: Optional[datetime] = None, to_dt: Optional[datetime] = None) -> List[Dict[str, Any]]:
    query = db.query(Incident.severity, func.count(Incident.id).label("count"))
    
    if from_dt:
        query = query.filter(Incident.timestamp >= from_dt)
    if to_dt:
        query = query.filter(Incident.timestamp <= to_dt)
        
    results = query.group_by(Incident.severity).order_by(desc("count"), Incident.severity).all()
    
    return [{"severity": r.severity, "count": r.count} for r in results]

def get_alerts_by_status(db: Session, from_dt: Optional[datetime] = None, to_dt: Optional[datetime] = None) -> List[Dict[str, Any]]:
    query = db.query(Alert.status, func.count(Alert.id).label("count"))
    
    if from_dt:
        query = query.filter(Alert.created_at >= from_dt)
    if to_dt:
        query = query.filter(Alert.created_at <= to_dt)
        
    results = query.group_by(Alert.status).order_by(desc("count"), Alert.status).all()
    
    return [{"status": r.status, "count": r.count} for r in results]
