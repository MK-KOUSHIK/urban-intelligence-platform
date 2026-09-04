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

# A. POTHOLE creates incident
def test_a_pothole_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("A1", "POTHOLE"))
    inc = db_session.query(Incident).filter_by(event_id="A1").first()
    assert inc is not None
    assert inc.incident_type == "pothole"

# B. ROAD_DAMAGE creates incident
def test_b_road_damage_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("B1", "ROAD_DAMAGE"))
    inc = db_session.query(Incident).filter_by(event_id="B1").first()
    assert inc is not None
    assert inc.incident_type == "road_damage"

# C. WATERLOGGING creates incident
def test_c_waterlogging_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("C1", "WATERLOGGING"))
    inc = db_session.query(Incident).filter_by(event_id="C1").first()
    assert inc is not None
    assert inc.incident_type == "waterlogging"

# D. MISSING_SIGN creates incident
def test_d_missing_sign_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("D1", "MISSING_SIGN"))
    inc = db_session.query(Incident).filter_by(event_id="D1").first()
    assert inc is not None
    assert inc.incident_type == "missing_sign"

# E. PEDESTRIAN creates incident
def test_e_pedestrian_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("E1", "PEDESTRIAN"))
    inc = db_session.query(Incident).filter_by(event_id="E1").first()
    assert inc is not None
    assert inc.incident_type == "pedestrian"

# F. VEHICLE creates incident
def test_f_vehicle_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("F1", "VEHICLE"))
    inc = db_session.query(Incident).filter_by(event_id="F1").first()
    assert inc is not None
    assert inc.incident_type == "vehicle"

# G. OTHER creates incident
def test_g_other_creates_incident(client, db_session):
    client.post("/api/events", json=get_valid_payload("G1", "OTHER"))
    inc = db_session.query(Incident).filter_by(event_id="G1").first()
    assert inc is not None
    assert inc.incident_type == "other"

# H. confidence >= 0.85 -> high
def test_h_confidence_high(client, db_session):
    client.post("/api/events", json=get_valid_payload("H1", "POTHOLE", 0.85))
    inc = db_session.query(Incident).filter_by(event_id="H1").first()
    assert inc.severity == "high"

# I. confidence between 0.65 and 0.849... -> medium
def test_i_confidence_medium(client, db_session):
    client.post("/api/events", json=get_valid_payload("I1", "POTHOLE", 0.65))
    inc = db_session.query(Incident).filter_by(event_id="I1").first()
    assert inc.severity == "medium"
    
    client.post("/api/events", json=get_valid_payload("I2", "POTHOLE", 0.84))
    inc2 = db_session.query(Incident).filter_by(event_id="I2").first()
    assert inc2.severity == "medium"

# J. confidence < 0.65 -> low
def test_j_confidence_low(client, db_session):
    client.post("/api/events", json=get_valid_payload("J1", "POTHOLE", 0.64))
    inc = db_session.query(Incident).filter_by(event_id="J1").first()
    assert inc.severity == "low"

# K. New incident status is open
def test_k_new_incident_status_open(client, db_session):
    client.post("/api/events", json=get_valid_payload("K1", "POTHOLE", 0.90))
    inc = db_session.query(Incident).filter_by(event_id="K1").first()
    assert inc.status == "open"

# L. Original event timestamp is preserved
def test_l_original_timestamp(client, db_session):
    client.post("/api/events", json=get_valid_payload("L1", "POTHOLE", 0.90))
    inc = db_session.query(Incident).filter_by(event_id="L1").first()
    assert inc.timestamp.isoformat() in ("2026-09-04T13:05:22", "2026-09-04T13:05:22+00:00", "2026-09-04T13:05:22Z")

# M. GPS is preserved
def test_m_gps_preserved(client, db_session):
    client.post("/api/events", json=get_valid_payload("M1", "POTHOLE", 0.90))
    inc = db_session.query(Incident).filter_by(event_id="M1").first()
    assert inc.latitude == 17.385044
    assert inc.longitude == 78.486671
    assert inc.accuracy_meters == 5.2

# N. recordingId is preserved when provided
def test_n_recordingid_preserved(client, db_session):
    client.post("/api/events", json=get_valid_payload("N1", "POTHOLE", 0.90))
    inc = db_session.query(Incident).filter_by(event_id="N1").first()
    assert inc.recording_id == "REC_001"

# O. boundingBox is preserved when provided
def test_o_boundingbox_preserved(client, db_session):
    client.post("/api/events", json=get_valid_payload("O1", "POTHOLE", 0.90))
    inc = db_session.query(Incident).filter_by(event_id="O1").first()
    assert inc.bbox_left == 0.31
    assert inc.bbox_top == 0.42
    assert inc.bbox_right == 0.56
    assert inc.bbox_bottom == 0.68

# P. Duplicate event does not create duplicate incident
def test_p_duplicate_event(client, db_session):
    payload = get_valid_payload("P1", "POTHOLE", 0.90)
    client.post("/api/events", json=payload)
    client.post("/api/events", json=payload) # submit twice
    client.post("/api/events", json=payload) # submit thrice
    
    assert db_session.query(Event).filter_by(event_id="P1").count() == 1
    assert db_session.query(Incident).filter_by(event_id="P1").count() == 1

# Q. Invalid event does not create incident
def test_q_invalid_event(client, db_session):
    payload = get_valid_payload("Q1", "POTHOLE", 1.5) # Invalid confidence
    client.post("/api/events", json=payload)
    
    assert db_session.query(Event).filter_by(event_id="Q1").count() == 0
    assert db_session.query(Incident).filter_by(event_id="Q1").count() == 0
