from app.models.events import Event

def get_valid_payload(event_id="EVT_001", event_type="POTHOLE"):
    return {
      "events": [
        {
          "eventId": event_id,
          "eventType": event_type,
          "confidence": 0.91,
          "timestamp": "2026-09-04T13:05:22Z",
          "recordingId": "REC_001",
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
      ]
    }

# TEST 1: Single valid POTHOLE event → 201/accepted → database contains one event.
def test_1_single_valid_pothole(client, db_session):
    payload = get_valid_payload("EVT_T1", "POTHOLE")
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert len(data["accepted"]) == 1
    assert data["accepted"][0]["eventId"] == "EVT_T1"
    
    db_events = db_session.query(Event).all()
    assert len(db_events) == 1
    assert db_events[0].event_id == "EVT_T1"

# TEST 2: Single valid ROAD_DAMAGE event → accepted.
def test_2_road_damage(client, db_session):
    payload = get_valid_payload("EVT_T2", "ROAD_DAMAGE")
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert len(data["accepted"]) == 1
    
    db_evt = db_session.query(Event).first()
    assert db_evt.event_type == "road_damage"

# TEST 3: Batch containing 3 valid events → all accepted.
def test_3_batch_valid(client, db_session):
    payload = {
        "events": [
            get_valid_payload("EVT_B1")["events"][0],
            get_valid_payload("EVT_B2")["events"][0],
            get_valid_payload("EVT_B3")["events"][0]
        ]
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert len(data["accepted"]) == 3
    assert db_session.query(Event).count() == 3

# TEST 4: Same eventId submitted twice → only one database record.
def test_4_duplicate_event_id(client, db_session):
    payload = get_valid_payload("EVT_DUP")
    client.post("/api/events", json=payload) # First time
    
    response = client.post("/api/events", json=payload) # Second time
    data = response.json()
    assert data["success"] is True
    assert len(data["duplicates"]) == 1
    assert data["duplicates"][0]["status"] == "already_exists"
    assert db_session.query(Event).count() == 1

# TEST 5: Invalid confidence → validation error.
def test_5_invalid_confidence(client, db_session):
    payload = get_valid_payload("EVT_C1")
    payload["events"][0]["confidence"] = 1.5
    response = client.post("/api/events", json=payload)
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) == 1
    assert "confidence" in data["errors"][0]["field"]
    assert db_session.query(Event).count() == 0

# TEST 6: Invalid latitude → validation error.
def test_6_invalid_latitude(client):
    payload = get_valid_payload("EVT_L1")
    payload["events"][0]["location"]["latitude"] = 150.0
    response = client.post("/api/events", json=payload)
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) == 1
    assert "latitude" in data["errors"][0]["field"]

# TEST 7: Invalid longitude → validation error.
def test_7_invalid_longitude(client):
    payload = get_valid_payload("EVT_L2")
    payload["events"][0]["location"]["longitude"] = 250.0
    response = client.post("/api/events", json=payload)
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) == 1
    assert "longitude" in data["errors"][0]["field"]

# TEST 8: Invalid bounding box → validation error.
def test_8_invalid_bounding_box(client):
    payload = get_valid_payload("EVT_BBOX")
    payload["events"][0]["boundingBox"]["left"] = -0.5
    response = client.post("/api/events", json=payload)
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) == 1
    assert "boundingBox" in data["errors"][0]["field"]

# TEST 9: Missing optional recordingId → event can still be accepted if the current schema allows it.
def test_9_missing_recording_id(client, db_session):
    payload = get_valid_payload("EVT_M1")
    del payload["events"][0]["recordingId"]
    response = client.post("/api/events", json=payload)
    assert response.json()["success"] is True
    db_evt = db_session.query(Event).first()
    assert db_evt.recording_id is None

# TEST 10: Missing GPS → behavior follows the existing schema's nullable design.
def test_10_missing_gps(client, db_session):
    payload = get_valid_payload("EVT_M2")
    del payload["events"][0]["location"]
    response = client.post("/api/events", json=payload)
    assert response.json()["success"] is True
    db_evt = db_session.query(Event).first()
    assert db_evt.latitude is None

# TEST 11: Original timestamp is preserved.
def test_11_original_timestamp(client, db_session):
    payload = get_valid_payload("EVT_T_ORIG")
    client.post("/api/events", json=payload)
    db_evt = db_session.query(Event).first()
    # Pydantic parses datetime string, SQLAlchemy might store timezone aware or naive.
    # Just check it matches the original concept.
    assert db_evt.timestamp.isoformat() in ("2026-09-04T13:05:22", "2026-09-04T13:05:22+00:00", "2026-09-04T13:05:22Z")

# TEST 12: received_at is generated separately by the backend.
def test_12_received_at(client, db_session):
    payload = get_valid_payload("EVT_RECV")
    client.post("/api/events", json=payload)
    db_evt = db_session.query(Event).first()
    assert db_evt.received_at is not None
    assert db_evt.timestamp != db_evt.received_at
