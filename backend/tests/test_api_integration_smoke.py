import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.core import Base, engine
from app.database.deps import get_db
from app.models.users import User
from app.auth.security import get_password_hash
from app.auth.deps import get_current_user
from app.auth.device_deps import get_authenticated_device

@pytest.fixture(autouse=True)
def setup_smoke_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def smoke_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Ensure real auth dependencies run
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
    if get_authenticated_device in app.dependency_overrides:
        del app.dependency_overrides[get_authenticated_device]

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

def test_frontend_full_integration_smoke_flow(smoke_client):
    # 1. Login & Obtain JWT
    login_res = smoke_client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "accessToken" in token_data
    token = token_data["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Current Authenticated User Info (/api/auth/me)
    me_res = smoke_client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_info = me_res.json()
    assert user_info["username"] == "admin"
    assert user_info["role"] == "admin"

    # 3. System Status
    health_res = smoke_client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "ok"

    status_res = smoke_client.get("/api/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["service"] == "urban-intelligence-backend"

    # 4. Provision Device and Ingest Event (Admin provisioning)
    dev_res = smoke_client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV_SMOKE",
        "name": "Smoke Device",
        "deviceType": "camera"
    }, headers=headers)
    assert dev_res.status_code == 200

    cred_res = smoke_client.post("/api/registry/devices/DEV_SMOKE/credentials", headers=headers)
    assert cred_res.status_code == 200
    device_key = cred_res.json()["apiKey"]

    smoke_client.post("/api/recordings", json={
        "recordingId": "REC_SMOKE_1",
        "deviceId": "DEV_SMOKE",
        "status": "completed"
    }, headers={"X-Device-Key": device_key})

    ingest_res = smoke_client.post("/api/events", json={
        "events": [{
            "eventId": "EVT_SMOKE_1",
            "eventType": "POTHOLE",
            "confidence": 0.95,
            "timestamp": "2026-09-04T12:00:00Z",
            "recordingId": "REC_SMOKE_1",
            "location": {"latitude": 17.385, "longitude": 78.486, "accuracyMeters": 5.0}
        }]
    }, headers={"X-Device-Key": device_key})
    assert ingest_res.status_code == 201

    # 5. Dashboard Overview
    dash_res = smoke_client.get("/api/dashboard/overview", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "summary" in dash_data
    assert "recentIncidents" in dash_data
    assert "recentAlerts" in dash_data
    assert len(dash_data["recentIncidents"]) >= 1

    # 6. Incidents Listing & Pagination & Filter
    incidents_res = smoke_client.get("/api/incidents?page=1&pageSize=10", headers=headers)
    assert incidents_res.status_code == 200
    inc_list = incidents_res.json()
    assert "items" in inc_list
    assert inc_list["total"] >= 1
    assert "totalPages" in inc_list
    incident_id = inc_list["items"][0]["id"]

    # Incident Update
    patch_inc_res = smoke_client.patch(f"/api/incidents/{incident_id}", json={
        "status": "acknowledged",
        "description": "Reviewed by admin"
    }, headers=headers)
    assert patch_inc_res.status_code == 200
    assert patch_inc_res.json()["status"] == "acknowledged"

    # Incident Evidence
    evidence_res = smoke_client.get(f"/api/incidents/{incident_id}/evidence", headers=headers)
    assert evidence_res.status_code == 200
    assert evidence_res.json()["hasRecording"] is True

    # 7. Alerts Listing & Update
    alerts_res = smoke_client.get("/api/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alert_list = alerts_res.json()
    assert "totalPages" in alert_list
    assert len(alert_list["items"]) >= 1
    alert_id = alert_list["items"][0]["id"]

    patch_alert_res = smoke_client.patch(f"/api/alerts/{alert_id}", json={
        "status": "acknowledged"
    }, headers=headers)
    assert patch_alert_res.status_code == 200
    assert patch_alert_res.json()["status"] == "acknowledged"

    # 8. Analytics
    summary_analytics = smoke_client.get("/api/analytics/summary", headers=headers)
    assert summary_analytics.status_code == 200
    by_type = smoke_client.get("/api/analytics/incidents-by-type", headers=headers)
    assert by_type.status_code == 200
    by_severity = smoke_client.get("/api/analytics/incidents-by-severity", headers=headers)
    assert by_severity.status_code == 200
    by_status = smoke_client.get("/api/analytics/alerts-by-status", headers=headers)
    assert by_status.status_code == 200

    # 9. Map Endpoints
    map_inc = smoke_client.get(
        "/api/map/incidents?minLatitude=10&maxLatitude=20&minLongitude=70&maxLongitude=80",
        headers=headers
    )
    assert map_inc.status_code == 200
    assert len(map_inc.json()["items"]) >= 1

    heatmap = smoke_client.get(
        "/api/map/heatmap?minLatitude=10&maxLatitude=20&minLongitude=70&maxLongitude=80",
        headers=headers
    )
    assert heatmap.status_code == 200

    # 10. Fleet Registry
    routes_res = smoke_client.get("/api/registry/routes", headers=headers)
    assert routes_res.status_code == 200
    buses_res = smoke_client.get("/api/registry/buses", headers=headers)
    assert buses_res.status_code == 200
    devices_res = smoke_client.get("/api/registry/devices", headers=headers)
    assert devices_res.status_code == 200

    # 11. Recordings
    rec_res = smoke_client.get("/api/recordings", headers=headers)
    assert rec_res.status_code == 200
    assert rec_res.json()["total"] >= 1

    # 12. Error Responses Contract
    # 401 Unauthenticated
    assert smoke_client.get("/api/incidents").status_code == 401
    # 400 Bad Request
    assert smoke_client.get("/api/incidents?from=2026-09-05T00:00:00Z&to=2026-09-01T00:00:00Z", headers=headers).status_code == 400
    # 404 Not Found
    assert smoke_client.get("/api/incidents/NON_EXISTENT_ID", headers=headers).status_code == 404
    # 409 Conflict
    assert smoke_client.patch(f"/api/alerts/{alert_id}", json={"status": "unread"}, headers=headers).status_code == 409
    # 422 Unprocessable Entity (Bounding Box error)
    assert smoke_client.get("/api/map/incidents?minLatitude=100&maxLatitude=20&minLongitude=70&maxLongitude=80", headers=headers).status_code == 422

def test_cors_headers(smoke_client):
    res = smoke_client.options("/api/auth/login", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST"
    })
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
