import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.database.core import Base, engine
from app.database.deps import get_db
from app.models.users import User
from app.auth.security import get_password_hash
from app.services.websocket_manager import manager

@pytest.fixture(autouse=True)
def setup_ws_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def ws_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    admin = User(username="admin", password_hash=get_password_hash("adminpassword"), role="admin")
    db_session.add(admin)
    db_session.commit()

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_websocket_connection_and_broadcast_events(ws_client):
    # Establish admin token
    login_res = ws_client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Provision a device first to avoid device resolution failure in events
    dev_res = ws_client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV_WS",
        "name": "WS Device",
        "deviceType": "camera"
    }, headers=headers)
    assert dev_res.status_code == 200

    cred_res = ws_client.post("/api/registry/devices/DEV_WS/credentials", headers=headers)
    device_key = cred_res.json()["apiKey"]

    with ws_client.websocket_connect("/ws/events") as websocket:
        # 1. Ingest high severity incident to trigger incident.created and alert.created
        ingest_res = ws_client.post("/api/events", json={
            "events": [{
                "eventId": "EVT_WS_1",
                "eventType": "POTHOLE",
                "confidence": 0.95,
                "timestamp": "2026-09-04T12:00:00Z",
                "location": {"latitude": 17.385, "longitude": 78.486, "accuracyMeters": 5.0}
            }]
        }, headers={"X-Device-Key": device_key})
        assert ingest_res.status_code == 201

        # Receive broadcast messages for incident and alert creation
        received_types = []
        for _ in range(2):
            msg = websocket.receive_json()
            received_types.append(msg["type"])
        
        assert "incident.created" in received_types
        assert "alert.created" in received_types

        # 2. Test recording.created via POST /api/recordings
        rec_res = ws_client.post("/api/recordings", json={
            "recordingId": "REC_WS_EXPLICIT",
            "deviceId": "DEV_WS"
        }, headers={"X-Device-Key": device_key})
        assert rec_res.status_code == 200
        rec_id = rec_res.json()["id"]

        msg_rec = websocket.receive_json()
        assert msg_rec["type"] == "recording.created"
        assert msg_rec["data"]["recordingId"] == "REC_WS_EXPLICIT"

        # 3. Test recording.updated via PATCH /api/recordings/{id}
        rec_patch = ws_client.patch(f"/api/recordings/{rec_id}", json={
            "status": "available"
        }, headers=headers)
        assert rec_patch.status_code == 200

        msg_rec_upd = websocket.receive_json()
        assert msg_rec_upd["type"] == "recording.updated"
        assert msg_rec_upd["data"]["status"] == "available"

        # 4. Test incident.updated via PATCH /api/incidents/{id}
        inc_id = ws_client.get("/api/incidents", headers=headers).json()["items"][0]["id"]
        inc_patch = ws_client.patch(f"/api/incidents/{inc_id}", json={
            "status": "acknowledged"
        }, headers=headers)
        assert inc_patch.status_code == 200

        msg_inc_upd = websocket.receive_json()
        assert msg_inc_upd["type"] == "incident.updated"
        assert msg_inc_upd["data"]["status"] == "acknowledged"

        # 5. Test alert.updated via PATCH /api/alerts/{id}
        alt_id = ws_client.get("/api/alerts", headers=headers).json()["items"][0]["id"]
        alt_patch = ws_client.patch(f"/api/alerts/{alt_id}", json={
            "status": "acknowledged"
        }, headers=headers)
        assert alt_patch.status_code == 200

        msg_alt_upd = websocket.receive_json()
        assert msg_alt_upd["type"] == "alert.updated"
        assert msg_alt_upd["data"]["status"] == "acknowledged"

def test_websocket_disconnect_resilience(ws_client):
    with ws_client.websocket_connect("/ws/events") as websocket:
        pass  # Closes context

    # Broadcasting after disconnect should not crash the server
    asyncio.run(manager.broadcast({"type": "test.ping", "data": {}}))
