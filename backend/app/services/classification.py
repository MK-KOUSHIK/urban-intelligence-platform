def classify_severity(confidence: float) -> str:
    if confidence >= 0.85:
        return "high"
    elif confidence >= 0.65:
        return "medium"
    else:
        return "low"

def map_event_to_incident_type(event_type: str) -> str:
    # Explicit mapping requirement from Android event types -> incident types
    # Centralized and easy to test
    
    mapping = {
        "pothole": "pothole",
        "road_damage": "road_damage",
        "waterlogging": "waterlogging",
        "missing_sign": "missing_sign",
        "missing_zebra_crossing": "missing_sign",
        "pedestrian": "pedestrian",
        "pedestrian_event": "pedestrian",
        "vehicle": "vehicle",
        "vehicle_detection": "vehicle",
        "rash_driving": "vehicle",
        "anpr": "vehicle",
        "hit_and_run": "vehicle",
        "traffic_anomaly": "other",
        "other": "other"
    }
    
    return mapping.get(event_type.lower(), "other")
