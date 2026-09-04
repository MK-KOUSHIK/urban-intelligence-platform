import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from app.main import app
from app.database.deps import get_db
import urllib.parse
from app.auth.security import create_access_token

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
    
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def unauth_client(auth_client):
    return auth_client

@pytest.fixture(scope="function")
def admin_token(auth_client):
    res = auth_client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    return res.json()["accessToken"]

def test_health_check_unauthenticated(unauth_client):
    response = unauth_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_status_requires_authentication(unauth_client):
    response = unauth_client.get("/api/status")
    assert response.status_code == 401

def test_status_authenticated(auth_client, admin_token):
    response = auth_client.get("/api/status", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "urban-intelligence-backend"
    assert "version" in data

def test_dashboard_overview_requires_authentication(unauth_client):
    response = unauth_client.get("/api/dashboard/overview")
    assert response.status_code == 401

def test_dashboard_overview_authenticated(auth_client, db_session, admin_token):
    # Seed some data to ensure overview isn't empty
    from app.models.incidents import Incident
    from app.models.alerts import Alert
    import uuid
    
    incident_id = str(uuid.uuid4())
    test_incident = Incident(
        incident_id=incident_id,
        event_id=str(uuid.uuid4()),
        incident_type="pothole",
        severity="medium",
        confidence=0.8,
        status="open",
        timestamp=datetime.now(timezone.utc),
        latitude=10.0,
        longitude=20.0
    )
    db_session.add(test_incident)
    
    test_alert = Alert(
        alert_id=str(uuid.uuid4()),
        incident_id=incident_id,
        alert_type="severe_hazard",
        severity="high",
        message="Test alert",
        status="unread",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(test_alert)
    db_session.commit()

    response = auth_client.get("/api/dashboard/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    
    # Check structure
    assert "summary" in data
    assert "recentIncidents" in data
    assert "recentAlerts" in data
    
    # Check summary
    assert data["summary"]["totalIncidents"] >= 1
    assert data["summary"]["openIncidents"] >= 1
    assert data["summary"]["totalAlerts"] >= 1
    
    # Check recent arrays
    assert len(data["recentIncidents"]) >= 1
    assert len(data["recentIncidents"]) <= 10
    
    assert len(data["recentAlerts"]) >= 1
    assert len(data["recentAlerts"]) <= 10

def test_dashboard_roles(auth_client, db_session):
    # Test that traffic_authority and municipal_authority can also access dashboard
    from app.models.users import User
    from app.auth.security import get_password_hash
    
    users = [
        User(username="traffic_dash", password_hash=get_password_hash("password"), role="traffic_authority"),
        User(username="muni_dash", password_hash=get_password_hash("password"), role="municipal_authority")
    ]
    for u in users:
        db_session.add(u)
    db_session.commit()
    
    for username, role in [("traffic", "traffic_authority"), ("municipal", "municipal_authority")]:
        res = auth_client.post("/api/auth/login", json={"username": username, "password": f"{username}password"})
        assert res.status_code == 200
        token = res.json()["accessToken"]
        
        response = auth_client.get("/api/dashboard/overview", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

def test_cors_headers(unauth_client):
    # Make an OPTIONS request to check CORS
    response = unauth_client.options("/health", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET"
    })
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
