import pytest
from pydantic import ValidationError
from datetime import datetime, timezone
from app.schemas.events import AIEvent, EventType, Severity, Status, Incident, Alert, Evidence, Location, BoundingBox

def test_valid_ai_event():
    # Previous format test
    event = AIEvent(
        event_type="pothole",
        confidence=0.91,
        timestamp="2026-09-04T10:32:00Z",
        latitude=12.9352,
        longitude=77.6245,
        bus_id="BUS-102",
        route_id="R-12",
        description="Road pothole detected"
    )
    assert event.event_type == EventType.pothole
    assert event.confidence == 0.91
    assert event.timestamp.isoformat() == "2026-09-04T10:32:00+00:00"

def test_android_contract_ai_event():
    # Payload simulating Android client JSON
    payload = {
      "eventId": "EVT_20260904_130522_001",
      "eventType": "POTHOLE",
      "confidence": 0.91,
      "timestamp": "2026-09-04T13:05:22Z",
      "recordingId": "REC_20260904_130500",
      "location": {
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracyMeters": 5.2
      },
      "boundingBox": {
        "left": 0.31,
        "top": 0.42,
        "right": 0.56,
        "bottom": 0.68
      }
    }
    
    event = AIEvent.model_validate(payload)
    
    assert event.event_id == "EVT_20260904_130522_001"
    # Case conversion should work
    assert event.event_type == EventType.pothole
    assert event.confidence == 0.91
    assert event.timestamp.isoformat() == "2026-09-04T13:05:22+00:00"
    assert event.recording_id == "REC_20260904_130500"
    
    # Nested location
    assert event.location is not None
    assert event.location.latitude == 17.385044
    assert event.location.longitude == 78.486671
    assert event.location.accuracy_meters == 5.2
    
    # Nested boundingBox
    assert event.bounding_box is not None
    assert event.bounding_box.left == 0.31
    assert event.bounding_box.bottom == 0.68

def test_invalid_confidence():
    with pytest.raises(ValidationError):
        AIEvent(
            event_type="pothole",
            confidence=1.5,
            timestamp="2026-09-04T10:32:00Z"
        )
    with pytest.raises(ValidationError):
        AIEvent(
            event_type="pothole",
            confidence=-0.1,
            timestamp="2026-09-04T10:32:00Z"
        )

def test_invalid_latitude_longitude():
    # Root level test
    with pytest.raises(ValidationError):
        AIEvent(
            event_type="pothole",
            confidence=0.9,
            timestamp="2026-09-04T10:32:00Z",
            latitude=95.0,
            longitude=0.0
        )
    # Nested level test
    with pytest.raises(ValidationError):
        Location(
            latitude=0.0,
            longitude=185.0
        )

def test_invalid_bounding_box():
    with pytest.raises(ValidationError):
        BoundingBox(left=-0.1, top=0.5, right=0.5, bottom=0.5)
    with pytest.raises(ValidationError):
        BoundingBox(left=0.1, top=0.5, right=1.5, bottom=0.5)

def test_valid_null_latitude_longitude():
    event = AIEvent(
        event_type="pothole",
        confidence=0.9,
        timestamp="2026-09-04T10:32:00Z",
        latitude=None,
        longitude=None
    )
    assert event.latitude is None
    assert event.longitude is None
    assert event.location is None

def test_invalid_event_type():
    with pytest.raises(ValidationError):
        AIEvent(
            event_type="unknown_event",
            confidence=0.9,
            timestamp="2026-09-04T10:32:00Z"
        )

def test_valid_incident():
    incident = Incident(
        incident_id="INC-001",
        event_type="rash_driving",
        severity="high",
        status="new",
        title="Rash Driving on Main St",
        created_at="2026-09-04T10:32:00Z",
        updated_at="2026-09-04T10:32:00Z"
    )
    assert incident.severity == Severity.high
    assert incident.status == Status.new

def test_invalid_severity():
    with pytest.raises(ValidationError):
        Incident(
            incident_id="INC-001",
            event_type="rash_driving",
            severity="extreme",
            status="new",
            title="Rash Driving",
            created_at="2026-09-04T10:32:00Z",
            updated_at="2026-09-04T10:32:00Z"
        )

def test_invalid_status():
    with pytest.raises(ValidationError):
        Incident(
            incident_id="INC-001",
            event_type="rash_driving",
            status="pending",
            title="Rash Driving",
            created_at="2026-09-04T10:32:00Z",
            updated_at="2026-09-04T10:32:00Z"
        )

def test_invalid_timestamp():
    with pytest.raises(ValidationError):
        AIEvent(
            event_type="pothole",
            confidence=0.9,
            timestamp="not-a-timestamp"
        )
