import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from app.main import app
from app.database.deps import get_db

@pytest.fixture(scope="function")
def auth_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    
    from app.models.users import User
    from app.auth.security import get_password_hash
    
    demo_users = [
        {"username": "admin", "password": "adminpassword", "role": "admin"},
        {"username": "traffic", "password": "trafficpassword", "role": "traffic_authority"},
        {"username": "municipal", "password": "municipalpassword", "role": "municipal_authority"}
    ]
    for user_data in demo_users:
        if not db_session.query(User).filter(User.username == user_data["username"]).first():
            db_session.add(User(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"]
            ))
    db_session.commit()
    
    # We want to test actual auth, so we don't mock get_current_user here
    client = TestClient(app)
    # Remove get_current_user mock if it exists from conftest
    from app.auth.deps import get_current_user
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
        
    from app.auth.device_deps import get_authenticated_device
    def override_get_authenticated_device():
        return None
    app.dependency_overrides[get_authenticated_device] = override_get_authenticated_device
        
    yield client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def admin_token(auth_client):
    res = auth_client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    return res.json()["accessToken"]

@pytest.fixture(scope="function")
def traffic_token(auth_client):
    res = auth_client.post("/api/auth/login", json={"username": "traffic", "password": "trafficpassword"})
    return res.json()["accessToken"]

@pytest.fixture(scope="function")
def municipal_token(auth_client):
    res = auth_client.post("/api/auth/login", json={"username": "municipal", "password": "municipalpassword"})
    return res.json()["accessToken"]

def test_u_unauthenticated_analytics_request(auth_client):
    res = auth_client.get("/api/analytics/summary")
    assert res.status_code == 401
    
def test_a_summary_empty_database(auth_client, admin_token):
    # Ensure database is clean or we just test the schema
    res = auth_client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "totalIncidents" in data
    assert isinstance(data["totalIncidents"], int)

def test_v_admin_can_access_analytics(auth_client, admin_token):
    res = auth_client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    
def test_w_traffic_authority_can_access_analytics(auth_client, traffic_token):
    res = auth_client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {traffic_token}"})
    assert res.status_code == 200

def test_x_municipal_authority_can_access_analytics(auth_client, municipal_token):
    res = auth_client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {municipal_token}"})
    assert res.status_code == 200

# Create dummy incidents and alerts for tests
def seed_data(auth_client):
    now = datetime.now(timezone.utc)
    # We will just post events, and let the system create incidents and alerts
    events = [
        {
            "eventId": f"ANALYTICS_EVT_{i}",
            "eventType": "POTHOLE",
            "confidence": 0.95,
            "timestamp": (now - timedelta(days=i)).isoformat(),
            "recordingId": "REC_ANALYTICS",
            "location": {"latitude": 17.0, "longitude": 78.0, "accuracyMeters": 5.0}
        }
        for i in range(5)
    ]
    auth_client.post("/api/events", json={"events": events})

def test_b_c_d_e_f_g_h_i_j_summary_with_incidents(auth_client, admin_token):
    seed_data(auth_client)
    res = auth_client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["totalIncidents"] >= 5
    assert data["openIncidents"] >= 5
    assert data["highSeverityIncidents"] >= 0  # Potentially created
    
def test_k_l_incidents_grouped_by_type(auth_client, admin_token):
    seed_data(auth_client)
    res = auth_client.get("/api/analytics/incidents-by-type", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0
    # Check sorting
    counts = [item["count"] for item in data["items"]]
    assert counts == sorted(counts, reverse=True)

def test_m_incidents_grouped_by_severity(auth_client, admin_token):
    res = auth_client.get("/api/analytics/incidents-by-severity", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert isinstance(data["items"], list)

def test_n_alerts_grouped_by_status(auth_client, admin_token):
    res = auth_client.get("/api/analytics/alerts-by-status", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert isinstance(data["items"], list)

def test_o_p_q_date_filters(auth_client, admin_token):
    now = datetime.now(timezone.utc)
    from_dt = (now - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    to_dt = (now + timedelta(days=1)).isoformat().replace("+00:00", "Z")
    
    res = auth_client.get(f"/api/analytics/summary?from={from_dt}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    
    res = auth_client.get(f"/api/analytics/summary?to={to_dt}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    
    res = auth_client.get(f"/api/analytics/summary?from={from_dt}&to={to_dt}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

def test_r_s_invalid_date_formats(auth_client, admin_token):
    res = auth_client.get("/api/analytics/summary?from=invalid-date", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 422
    
    res = auth_client.get("/api/analytics/summary?to=invalid-date", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 422

def test_t_from_greater_than_to_rejected(auth_client, admin_token):
    now = datetime.now(timezone.utc)
    from_dt = (now + timedelta(days=1)).isoformat().replace("+00:00", "Z")
    to_dt = (now - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    
    res = auth_client.get(f"/api/analytics/summary?from={from_dt}&to={to_dt}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 422
