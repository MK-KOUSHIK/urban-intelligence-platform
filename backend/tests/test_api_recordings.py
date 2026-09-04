import pytest

def test_create_recording_success(client):
    payload = {
        "recordingId": "REC_TEST_001",
        "durationSeconds": 120,
        "fileSizeBytes": 1024000,
        "status": "available"
    }
    response = client.post("/api/recordings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["recordingId"] == "REC_TEST_001"
    assert data["status"] == "available"
    assert data["durationSeconds"] == 120

def test_create_recording_duplicate(client):
    payload = {
        "recordingId": "REC_TEST_002",
        "status": "uploading"
    }
    response = client.post("/api/recordings", json=payload)
    assert response.status_code == 200
    
    response2 = client.post("/api/recordings", json=payload)
    assert response2.status_code == 409

def test_create_recording_with_device(client):
    # Register device
    client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV_REC_001",
        "name": "Rec Device",
        "deviceType": "camera",
        "isActive": True
    })

    payload = {
        "recordingId": "REC_TEST_003",
        "deviceId": "DEV_REC_001",
        "status": "available"
    }
    response = client.post("/api/recordings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["recordingId"] == "REC_TEST_003"
    assert data["deviceId"] == "DEV_REC_001"

def test_update_recording(client):
    payload = {
        "recordingId": "REC_TEST_004",
        "status": "uploading"
    }
    create_resp = client.post("/api/recordings", json=payload)
    rec_id = create_resp.json()["id"]

    update_payload = {
        "status": "available",
        "fileSizeBytes": 2048000
    }
    update_resp = client.patch(f"/api/recordings/{rec_id}", json=update_payload)
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["status"] == "available"
    assert data["fileSizeBytes"] == 2048000

def test_get_recording(client):
    payload = {
        "recordingId": "REC_TEST_005",
        "status": "available"
    }
    create_resp = client.post("/api/recordings", json=payload)
    rec_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/recordings/{rec_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["recordingId"] == "REC_TEST_005"

def test_list_recordings(client):
    payload = {
        "recordingId": "REC_TEST_006",
        "status": "available"
    }
    client.post("/api/recordings", json=payload)

    list_resp = client.get("/api/recordings")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert "items" in data
    assert data["total"] >= 1

def test_incident_evidence(client):
    # 1. Create recording
    payload = {
        "recordingId": "REC_TEST_007",
        "status": "available",
        "durationSeconds": 30
    }
    client.post("/api/recordings", json=payload)

    # 2. Create event linking to recording
    event_payload = {
        "eventId": "EVT_REC_001",
        "eventType": "POTHOLE",
        "confidence": 0.9,
        "timestamp": "2026-09-04T12:00:00Z",
        "recordingId": "REC_TEST_007",
        "location": {
            "latitude": 10.0,
            "longitude": 20.0,
            "accuracyMeters": 5.0
        }
    }
    client.post("/api/events", json={"events": [event_payload]})
    
    # 3. Get incidents to find incident_id
    incidents_resp = client.get("/api/incidents")
    incident_id = incidents_resp.json()["items"][0]["id"]

    # 4. Fetch evidence
    evidence_resp = client.get(f"/api/incidents/{incident_id}/evidence")
    assert evidence_resp.status_code == 200
    data = evidence_resp.json()
    
    assert data["incidentId"] == incident_id
    assert data["recordingId"] == "REC_TEST_007"
    assert data["hasRecording"] is True
    assert data["recordingMetadata"]["durationSeconds"] == 30

def test_recording_incidents(client):
    # 1. Create recording
    payload = {
        "recordingId": "REC_TEST_008",
        "status": "available"
    }
    rec_resp = client.post("/api/recordings", json=payload)
    rec_id = rec_resp.json()["id"]

    # 2. Create event linking to recording
    event_payload = {
        "eventId": "EVT_REC_002",
        "eventType": "POTHOLE",
        "confidence": 0.9,
        "timestamp": "2026-09-04T12:00:00Z",
        "recordingId": "REC_TEST_008",
        "location": {
            "latitude": 10.0,
            "longitude": 20.0,
            "accuracyMeters": 5.0
        }
    }
    client.post("/api/events", json={"events": [event_payload]})
    
    # 3. List incidents for recording
    inc_resp = client.get(f"/api/recordings/{rec_id}/incidents")
    assert inc_resp.status_code == 200
    data = inc_resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["eventId"] == "EVT_REC_002"
