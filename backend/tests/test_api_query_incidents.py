from app.models.events import Event
from app.models.incidents import Incident
from datetime import datetime, timezone

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

# A. GET /api/incidents with no filters
def test_a_list_incidents_no_filters(client, db_session):
    client.post("/api/events", json=get_valid_payload("A1", "POTHOLE"))
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1

# B. GET /api/incidents returns correct total
def test_b_list_incidents_total(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    client.post("/api/events", json=get_valid_payload("B1", "POTHOLE"))
    client.post("/api/events", json=get_valid_payload("B2", "POTHOLE"))
    
    response = client.get("/api/incidents")
    data = response.json()
    assert data["total"] == 2

# C. GET /api/incidents pagination
def test_c_pagination(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    for i in range(5):
        client.post("/api/events", json=get_valid_payload(f"C{i}", "POTHOLE"))
        
    response = client.get("/api/incidents?page=1&pageSize=2")
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5
    
    response2 = client.get("/api/incidents?page=3&pageSize=2")
    data2 = response2.json()
    assert len(data2["items"]) == 1

# D. pageSize limit
def test_d_page_size_limit(client, db_session):
    response = client.get("/api/incidents?pageSize=200")
    assert response.status_code == 422 # FastAPI built-in validation error for le=100

# E. incidentType filter
def test_e_incident_type_filter(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    client.post("/api/events", json=get_valid_payload("E1", "POTHOLE"))
    client.post("/api/events", json=get_valid_payload("E2", "ROAD_DAMAGE"))
    
    response = client.get("/api/incidents?incidentType=pothole")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["incidentType"] == "pothole"

# F. severity filter
def test_f_severity_filter(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    client.post("/api/events", json=get_valid_payload("F1", "POTHOLE", 0.90)) # high
    client.post("/api/events", json=get_valid_payload("F2", "POTHOLE", 0.40)) # low
    
    response = client.get("/api/incidents?severity=low")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["severity"] == "low"

# G. status filter
def test_g_status_filter(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    client.post("/api/events", json=get_valid_payload("G1", "POTHOLE"))
    
    # By default it's open
    response = client.get("/api/incidents?status=open")
    data = response.json()
    assert data["total"] == 1
    
    response2 = client.get("/api/incidents?status=closed")
    assert response2.json()["total"] == 0

# H. from date filter
def test_h_from_date_filter(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    payload = get_valid_payload("H1", "POTHOLE")
    payload["events"][0]["timestamp"] = "2026-09-04T10:00:00Z"
    client.post("/api/events", json=payload)
    
    response = client.get("/api/incidents?from=2026-09-04T12:00:00Z")
    assert response.json()["total"] == 0
    
    response2 = client.get("/api/incidents?from=2026-09-04T09:00:00Z")
    assert response2.json()["total"] == 1

# I. to date filter
def test_i_to_date_filter(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    payload = get_valid_payload("I1", "POTHOLE")
    payload["events"][0]["timestamp"] = "2026-09-04T10:00:00Z"
    client.post("/api/events", json=payload)
    
    response = client.get("/api/incidents?to=2026-09-04T09:00:00Z")
    assert response.json()["total"] == 0
    
    response2 = client.get("/api/incidents?to=2026-09-04T12:00:00Z")
    assert response2.json()["total"] == 1

# J. combined filters
def test_j_combined_filters(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    client.post("/api/events", json=get_valid_payload("J1", "POTHOLE", 0.9)) # pothole, high, open
    client.post("/api/events", json=get_valid_payload("J2", "ROAD_DAMAGE", 0.9)) # road_damage, high, open
    
    response = client.get("/api/incidents?incidentType=pothole&severity=high&status=open")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["eventId"] == "J1"

# K. newest-first ordering
def test_k_newest_first_ordering(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    payload1 = get_valid_payload("K1", "POTHOLE")
    payload1["events"][0]["timestamp"] = "2026-09-01T10:00:00Z"
    client.post("/api/events", json=payload1)
    
    payload2 = get_valid_payload("K2", "POTHOLE")
    payload2["events"][0]["timestamp"] = "2026-09-02T10:00:00Z" # Newer
    client.post("/api/events", json=payload2)
    
    response = client.get("/api/incidents")
    data = response.json()
    assert data["items"][0]["eventId"] == "K2"
    assert data["items"][1]["eventId"] == "K1"

# L. GET /api/incidents/{id} existing incident
def test_l_get_single_incident(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    res = client.post("/api/events", json=get_valid_payload("L1", "POTHOLE"))
    incident_id = res.json()["accepted"][0]["incidentId"]
    
    response = client.get(f"/api/incidents/{incident_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == incident_id
    assert data["eventId"] == "L1"
    
# M. GET /api/incidents/{id} nonexistent incident -> 404
def test_m_get_nonexistent_incident(client, db_session):
    response = client.get("/api/incidents/invalid-id-1234")
    assert response.status_code == 404
    assert response.json()["detail"] == "Incident not found"

# N. map-friendly location response
def test_n_map_friendly_location(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    res = client.post("/api/events", json=get_valid_payload("N1", "POTHOLE"))
    incident_id = res.json()["accepted"][0]["incidentId"]
    
    response = client.get(f"/api/incidents/{incident_id}")
    data = response.json()
    
    assert "location" in data
    assert data["location"]["latitude"] == 17.385044
    assert data["location"]["longitude"] == 78.486671
    assert data["location"]["accuracyMeters"] == 5.2

# O. response schema validation
def test_o_response_schema_validation(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    res = client.post("/api/events", json=get_valid_payload("O1", "POTHOLE"))
    incident_id = res.json()["accepted"][0]["incidentId"]
    
    response = client.get(f"/api/incidents/{incident_id}")
    data = response.json()
    
    # Check camelCase fields
    assert "eventId" in data
    assert "incidentType" in data
    assert "recordingId" in data
    assert "location" in data

# P. invalid pagination
def test_p_invalid_pagination(client, db_session):
    response = client.get("/api/incidents?page=0")
    assert response.status_code == 422
    
    response = client.get("/api/incidents?pageSize=0")
    assert response.status_code == 422

# Q. invalid filter values
def test_q_invalid_filter_values(client, db_session):
    # Depending on strictness, we might just return 0 results or 422 if an Enum is used
    # In our implementation they are typed as `str` so it should return 200 with 0 items
    response = client.get("/api/incidents?severity=invalid_severity")
    assert response.status_code == 200
    assert response.json()["total"] == 0

# R. invalid date range
def test_r_invalid_date_range(client, db_session):
    response = client.get("/api/incidents?from=2026-09-04T12:00:00Z&to=2026-09-01T12:00:00Z")
    assert response.status_code == 400
    assert response.json()["detail"] == "from date cannot be after to date"

# S. test empty location translates to null (optional extra check for schema compliance)
def test_s_null_location(client, db_session):
    db_session.query(Incident).delete()
    db_session.query(Event).delete()
    db_session.commit()
    
    payload = get_valid_payload("S1", "POTHOLE")
    payload["events"][0].pop("location")
    
    res = client.post("/api/events", json=payload)
    incident_id = res.json()["accepted"][0]["incidentId"]
    
    response = client.get(f"/api/incidents/{incident_id}")
    data = response.json()
    
    assert data["location"] is None
