import pytest
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from app.models.events import Event
from app.schemas.events import AIEvent

def test_insert_android_event_payload(db_session):
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
    
    # 1. Parse via Pydantic to ensure it's valid Android format
    event_schema = AIEvent.model_validate(payload)
    
    # Set server receive time manually
    received_time = datetime.now(timezone.utc)
    event_schema.received_at = received_time

    # 2. Map to DB model
    db_event = Event(
        event_id=event_schema.event_id,
        event_type=event_schema.event_type.value,
        confidence=event_schema.confidence,
        timestamp=event_schema.timestamp,
        received_at=event_schema.received_at,
        recording_id=event_schema.recording_id,
        latitude=event_schema.location.latitude if event_schema.location else None,
        longitude=event_schema.location.longitude if event_schema.location else None,
        accuracy_meters=event_schema.location.accuracy_meters if event_schema.location else None,
        bbox_left=event_schema.bounding_box.left if event_schema.bounding_box else None,
        bbox_top=event_schema.bounding_box.top if event_schema.bounding_box else None,
        bbox_right=event_schema.bounding_box.right if event_schema.bounding_box else None,
        bbox_bottom=event_schema.bounding_box.bottom if event_schema.bounding_box else None
    )
    
    db_session.add(db_event)
    db_session.commit()
    db_session.refresh(db_event)
    
    # 2. Verify it is persisted
    assert db_event.id is not None
    
    # 4. Verify timestamp and received_at remain separate
    assert db_event.timestamp != db_event.received_at
    assert db_event.timestamp.isoformat() in ("2026-09-04T13:05:22", "2026-09-04T13:05:22+00:00")
    
    # 5. Verify nested location values are persisted
    assert db_event.latitude == 17.385044
    assert db_event.longitude == 78.486671
    assert db_event.accuracy_meters == 5.2
    
    # 6. Verify bounding box values are persisted
    assert db_event.bbox_left == 0.31
    assert db_event.bbox_bottom == 0.68
    
    # 7. Verify recordingId is persisted
    assert db_event.recording_id == "REC_20260904_130500"

def test_event_id_unique(db_session):
    event1 = Event(
        event_id="DUPE-123",
        event_type="pothole",
        confidence=0.9,
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(event1)
    db_session.commit()
    
    event2 = Event(
        event_id="DUPE-123",
        event_type="vehicle_detection",
        confidence=0.8,
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(event2)
    
    # 3. Verify eventId is unique
    with pytest.raises(IntegrityError):
        db_session.commit()

def test_optional_fields_remain_null(db_session):
    event = Event(
        event_id="MINIMAL-123",
        event_type="pothole",
        confidence=0.9,
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    
    # 8. Verify optional fields can remain null
    assert event.recording_id is None
    assert event.latitude is None
    assert event.bbox_left is None
    assert event.bus_id is None
