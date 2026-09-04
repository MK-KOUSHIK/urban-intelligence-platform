import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.core import Base, engine
from app.database.deps import get_db
from sqlalchemy.orm import Session
from app.models.incidents import Incident
from app.models.alerts import Alert

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def create_event(client, event_id="EVT_A", event_type="POTHOLE", confidence=0.91):
    return client.post("/api/events", json={
        "events": [{
            "eventId": event_id,
            "eventType": event_type,
            "confidence": confidence,
            "timestamp": "2026-09-04T13:05:22Z",
            "recordingId": "REC_A",
            "location": {"latitude": 17.0, "longitude": 78.0, "accuracyMeters": 5.0},
            "boundingBox": {"left": 0.1, "top": 0.1, "right": 0.2, "bottom": 0.2}
        }]
    })

def test_a_high_severity_alert(client):
    # confidence=0.91 is high severity for pothole
    create_event(client, event_id="EVT_1", event_type="POTHOLE", confidence=0.91)
    
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["alertType"] == "high_severity"
    assert data["items"][0]["severity"] == "high"

def test_b_road_damage_alert(client):
    # confidence=0.4 is low severity, so only road_damage alert should fire
    create_event(client, event_id="EVT_2", event_type="ROAD_DAMAGE", confidence=0.4)
    
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["alertType"] == "road_damage"
    assert data["items"][0]["severity"] == "low"

def test_c_waterlogging_alert(client):
    create_event(client, event_id="EVT_3", event_type="WATERLOGGING", confidence=0.4)
    
    resp = client.get("/api/alerts")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["alertType"] == "waterlogging"

def test_d_multiple_alerts_for_one_incident(client):
    # road_damage with confidence 0.91 -> high_severity AND road_damage
    create_event(client, event_id="EVT_4", event_type="ROAD_DAMAGE", confidence=0.91)
    
    resp = client.get("/api/alerts")
    data = resp.json()
    assert data["total"] == 2
    types = [item["alertType"] for item in data["items"]]
    assert "high_severity" in types
    assert "road_damage" in types

def test_e_inherits_incident_severity(client):
    create_event(client, event_id="EVT_5", event_type="WATERLOGGING", confidence=0.7) # medium severity
    
    resp = client.get("/api/alerts")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["severity"] == "medium"

def test_f_starts_as_unread(client):
    create_event(client, event_id="EVT_6", event_type="WATERLOGGING", confidence=0.5)
    resp = client.get("/api/alerts")
    assert resp.json()["items"][0]["status"] == "unread"

def test_g_correct_message(client):
    create_event(client, event_id="EVT_7", event_type="WATERLOGGING", confidence=0.5)
    resp = client.get("/api/alerts")
    assert resp.json()["items"][0]["message"] == "Waterlogging detected"

def test_h_duplicate_event_does_not_create_duplicate_alert(client):
    create_event(client, event_id="EVT_8", event_type="WATERLOGGING", confidence=0.5)
    create_event(client, event_id="EVT_8", event_type="WATERLOGGING", confidence=0.5)
    
    resp = client.get("/api/alerts")
    assert resp.json()["total"] == 1

def test_i_same_incident_rule_cannot_duplicate(client, db_session):
    # Attempting to manually trigger rules twice on same incident
    create_event(client, event_id="EVT_9", event_type="WATERLOGGING", confidence=0.5)
    
    # simulate some internal trigger calling the rule service again
    inc = db_session.query(Incident).first()
    from app.services.alert_rules import evaluate_and_create_alerts
    evaluate_and_create_alerts(db_session, inc)
    db_session.commit()
        
    resp = client.get("/api/alerts")
    assert resp.json()["total"] == 1

def test_j_get_alerts_works(client):
    create_event(client, event_id="EVT_10", event_type="WATERLOGGING", confidence=0.5)
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    assert "items" in resp.json()

def test_k_pagination_works(client):
    for i in range(15):
        create_event(client, event_id=f"EVT_PAG_{i}", event_type="WATERLOGGING", confidence=0.5)
        
    resp = client.get("/api/alerts?page=2&pageSize=10")
    data = resp.json()
    assert len(data["items"]) == 5
    assert data["total"] == 15

def test_l_status_filter_works(client):
    create_event(client, event_id="EVT_11", event_type="WATERLOGGING", confidence=0.5)
    
    resp = client.get("/api/alerts?status=resolved")
    assert resp.json()["total"] == 0
    
    resp = client.get("/api/alerts?status=unread")
    assert resp.json()["total"] == 1

def test_m_severity_filter_works(client):
    create_event(client, event_id="EVT_12", event_type="ROAD_DAMAGE", confidence=0.91) # high
    create_event(client, event_id="EVT_13", event_type="ROAD_DAMAGE", confidence=0.4) # low
    
    resp = client.get("/api/alerts?severity=high")
    data = resp.json()
    # road_damage high severity creates 2 alerts (high_severity and road_damage)
    assert data["total"] == 2 
    for item in data["items"]:
        assert item["severity"] == "high"

def test_n_alerttype_filter_works(client):
    create_event(client, event_id="EVT_14", event_type="ROAD_DAMAGE", confidence=0.91) # high_severity, road_damage
    create_event(client, event_id="EVT_15", event_type="WATERLOGGING", confidence=0.5) # waterlogging
    
    resp = client.get("/api/alerts?alertType=waterlogging")
    assert resp.json()["total"] == 1
    
    resp = client.get("/api/alerts?alertType=road_damage")
    assert resp.json()["total"] == 1

def test_o_ordering_newest_first(client):
    create_event(client, event_id="EVT_16", event_type="WATERLOGGING", confidence=0.5)
    create_event(client, event_id="EVT_17", event_type="ROAD_DAMAGE", confidence=0.4)
    
    resp = client.get("/api/alerts")
    items = resp.json()["items"]
    
    assert items[0]["alertType"] == "road_damage"
    assert items[1]["alertType"] == "waterlogging"

def test_p_patch_unread_to_acknowledged(client):
    create_event(client, event_id="EVT_18", event_type="WATERLOGGING", confidence=0.5)
    alert_id = client.get("/api/alerts").json()["items"][0]["id"]
    
    resp = client.patch(f"/api/alerts/{alert_id}", json={"status": "acknowledged"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "acknowledged"

def test_q_patch_acknowledged_to_resolved(client):
    create_event(client, event_id="EVT_19", event_type="WATERLOGGING", confidence=0.5)
    alert_id = client.get("/api/alerts").json()["items"][0]["id"]
    
    client.patch(f"/api/alerts/{alert_id}", json={"status": "acknowledged"})
    
    resp = client.patch(f"/api/alerts/{alert_id}", json={"status": "resolved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"

def test_r_patch_unread_to_resolved(client):
    create_event(client, event_id="EVT_20", event_type="WATERLOGGING", confidence=0.5)
    alert_id = client.get("/api/alerts").json()["items"][0]["id"]
    
    resp = client.patch(f"/api/alerts/{alert_id}", json={"status": "resolved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"

def test_s_invalid_alert_transition_409(client):
    create_event(client, event_id="EVT_21", event_type="WATERLOGGING", confidence=0.5)
    alert_id = client.get("/api/alerts").json()["items"][0]["id"]
    
    client.patch(f"/api/alerts/{alert_id}", json={"status": "resolved"})
    
    resp = client.patch(f"/api/alerts/{alert_id}", json={"status": "unread"})
    assert resp.status_code == 409

def test_t_nonexistent_alert_404(client):
    resp = client.patch("/api/alerts/nonexistent", json={"status": "acknowledged"})
    assert resp.status_code == 404

def test_u_invalid_alert_status_validation(client):
    create_event(client, event_id="EVT_22", event_type="WATERLOGGING", confidence=0.5)
    alert_id = client.get("/api/alerts").json()["items"][0]["id"]
    
    resp = client.patch(f"/api/alerts/{alert_id}", json={"status": "fake_status"})
    assert resp.status_code == 409
