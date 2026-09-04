from app.models.events import Event
from app.models.incidents import Incident

def get_valid_payload(event_id="EVT_001", event_type="POTHOLE", confidence=0.91):
    return {
      "events": [
        {
          "eventId": event_id,
          "eventType": event_type,
          "confidence": confidence,
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

def _create_incident(client, event_id="A1"):
    res = client.post("/api/events", json=get_valid_payload(event_id, "POTHOLE"))
    return res.json()["accepted"][0]["incidentId"]

# A. open -> acknowledged
def test_a_open_to_acknowledged(client, db_session):
    incident_id = _create_incident(client, "A1")
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    assert res.status_code == 200
    assert res.json()["status"] == "acknowledged"

# B. acknowledged -> resolved
def test_b_acknowledged_to_resolved(client, db_session):
    incident_id = _create_incident(client, "B1")
    client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "resolved"})
    assert res.status_code == 200
    assert res.json()["status"] == "resolved"

# C. open -> resolved
def test_c_open_to_resolved(client, db_session):
    incident_id = _create_incident(client, "C1")
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "resolved"})
    assert res.status_code == 200
    assert res.json()["status"] == "resolved"

# D. resolved -> open rejected
def test_d_resolved_to_open_rejected(client, db_session):
    incident_id = _create_incident(client, "D1")
    client.patch(f"/api/incidents/{incident_id}", json={"status": "resolved"})
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "open"})
    assert res.status_code == 409
    assert res.json()["detail"] == "Invalid incident status transition"

# E. resolved -> acknowledged rejected
def test_e_resolved_to_acknowledged_rejected(client, db_session):
    incident_id = _create_incident(client, "E1")
    client.patch(f"/api/incidents/{incident_id}", json={"status": "resolved"})
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    assert res.status_code == 409
    assert res.json()["detail"] == "Invalid incident status transition"

# F. acknowledged -> open rejected
def test_f_acknowledged_to_open_rejected(client, db_session):
    incident_id = _create_incident(client, "F1")
    client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "open"})
    assert res.status_code == 409
    assert res.json()["detail"] == "Invalid incident status transition"

# G. nonexistent incident -> 404
def test_g_nonexistent_incident_404(client, db_session):
    res = client.patch("/api/incidents/invalid-1234", json={"status": "acknowledged"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Incident not found"

# H. updated status returned correctly
def test_h_updated_status_returned_correctly(client, db_session):
    incident_id = _create_incident(client, "H1")
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    data = res.json()
    assert data["status"] == "acknowledged"
    # also fetch again to ensure persistence
    res2 = client.get(f"/api/incidents/{incident_id}")
    assert res2.json()["status"] == "acknowledged"

# I. original timestamp remains unchanged
def test_i_original_timestamp_unchanged(client, db_session):
    incident_id = _create_incident(client, "I1")
    original_timestamp = client.get(f"/api/incidents/{incident_id}").json()["timestamp"]
    
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    new_timestamp = res.json()["timestamp"]
    assert original_timestamp == new_timestamp

# J. updated_at changes after update
def test_j_updated_at_changes(client, db_session):
    import time
    incident_id = _create_incident(client, "J1")
    
    # SQLAlchemy queries to check raw DB fields
    db_inc_1 = db_session.query(Incident).filter(Incident.incident_id == incident_id).first()
    original_updated_at = db_inc_1.updated_at
    
    time.sleep(0.1) # ensure a small time gap
    
    client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
    db_session.expire_all() # ensure we fetch fresh
    
    db_inc_2 = db_session.query(Incident).filter(Incident.incident_id == incident_id).first()
    assert db_inc_2.updated_at > original_updated_at

# K. description update if description is already supported
def test_k_description_update(client, db_session):
    incident_id = _create_incident(client, "K1")
    res = client.patch(f"/api/incidents/{incident_id}", json={"description": "Team notified"})
    assert res.status_code == 200
    assert res.json()["description"] == "Team notified"
    # Status should remain unchanged
    assert res.json()["status"] == "open"
    
    # Combined update
    res2 = client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged", "description": "Processing"})
    assert res2.json()["status"] == "acknowledged"
    assert res2.json()["description"] == "Processing"

# L. invalid status rejected
def test_l_invalid_status_rejected(client, db_session):
    # Depending on strictness, we might return 409 for transitions not defined.
    # In our implementation validate_status_transition("open", "invalid_status") -> False
    incident_id = _create_incident(client, "L1")
    res = client.patch(f"/api/incidents/{incident_id}", json={"status": "invalid_status"})
    assert res.status_code == 409
    assert res.json()["detail"] == "Invalid incident status transition"

# M. GET /api/incidents still works
def test_m_get_api_incidents_works(client, db_session):
    _create_incident(client, "M1")
    res = client.get("/api/incidents")
    assert res.status_code == 200
    assert res.json()["total"] >= 1

# N. GET /api/incidents/{id} still works
def test_n_get_single_api_incidents_works(client, db_session):
    incident_id = _create_incident(client, "N1")
    res = client.get(f"/api/incidents/{incident_id}")
    assert res.status_code == 200
    assert res.json()["eventId"] == "N1"

# O. POST /api/events still creates an open incident
def test_o_post_api_events_works(client, db_session):
    res = client.post("/api/events", json=get_valid_payload("O1", "POTHOLE"))
    assert res.status_code == 201
    
    incident_id = res.json()["accepted"][0]["incidentId"]
    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert incident["status"] == "open"

# P. Existing tests implicitly tested by running complete suite 
