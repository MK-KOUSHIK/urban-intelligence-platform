from sqlalchemy.orm import Session
from app.models.incidents import Incident
from app.models.alerts import Alert

def evaluate_and_create_alerts(db: Session, incident: Incident):
    alerts_to_create = []
    
    # RULE 1 - HIGH SEVERITY
    if incident.severity == "high":
        alerts_to_create.append({
            "alert_type": "high_severity",
            "message": "High severity incident detected"
        })
        
    # RULE 2 - ROAD DAMAGE
    if incident.incident_type == "road_damage":
        alerts_to_create.append({
            "alert_type": "road_damage",
            "message": "Road damage detected"
        })
        
    # RULE 3 - WATERLOGGING
    if incident.incident_type == "waterlogging":
        alerts_to_create.append({
            "alert_type": "waterlogging",
            "message": "Waterlogging detected"
        })
        
    new_alerts_list = []
    for alert_data in alerts_to_create:
        # Check idempotency to respect unique constraint
        exists = db.query(Alert).filter(
            Alert.incident_id == incident.incident_id,
            Alert.alert_type == alert_data["alert_type"]
        ).first()
        
        if not exists:
            new_alert = Alert(
                incident_id=incident.incident_id,
                alert_type=alert_data["alert_type"],
                severity=incident.severity, # inherits incident severity
                message=alert_data["message"],
                status="unread"
            )
            db.add(new_alert)
            new_alerts_list.append(new_alert)
            
    return new_alerts_list
