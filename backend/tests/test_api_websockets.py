import pytest
import uuid
from app.services.websocket_manager import manager

def test_a_websocket_connects_and_registers(client):
    assert len(manager.active_connections) == 0
    with client.websocket_connect("/ws/events") as websocket:
        assert len(manager.active_connections) == 1
    assert len(manager.active_connections) == 0

def test_b_incident_and_alert_broadcasts(client):
    with client.websocket_connect("/ws/events") as websocket:
        unique_id = f"EVT_WS_{uuid.uuid4().hex[:8]}"
        payload = {
            "events": [
                {
                    "eventId": unique_id,
                    "eventType": "ROAD_DAMAGE",
                    "confidence": 0.95,
                    "timestamp": "2026-09-04T14:00:00Z",
                    "recordingId": "REC_WS_001",
                    "location": {
                        "latitude": 17.385044,
                        "longitude": 78.486671,
                        "accuracyMeters": 5.2
                    }
                }
            ]
        }
        response = client.post("/api/events", json=payload)
        assert response.status_code == 201
        assert len(response.json()["accepted"]) == 1, response.json()
        
        # We should receive an incident.created message
        data1 = websocket.receive_json()
        assert data1["type"] == "incident.created"
        
        incident_data = data1["data"]
        assert incident_data["eventId"] == unique_id
        assert incident_data["incidentType"] == "road_damage"
        assert incident_data["severity"] == "high" # 0.95 -> high
        incident_id = incident_data["id"]
        
        # We should receive TWO alert.created messages (high_severity and road_damage)
        data2 = websocket.receive_json()
        data3 = websocket.receive_json()
        
        alerts_types = {data2["data"]["alertType"], data3["data"]["alertType"]}
        assert alerts_types == {"high_severity", "road_damage"}
        
        alert_id = data2["data"]["id"]
        
        # L, M: Duplicate event does not broadcast duplicate incident or alert
        response2 = client.post("/api/events", json=payload)
        assert response2.status_code == 201
        
        # Let's do a patch to incident to get incident.updated
        patch_res = client.patch(f"/api/incidents/{incident_id}", json={"status": "acknowledged"})
        assert patch_res.status_code == 200
        
        data4 = websocket.receive_json()
        assert data4["type"] == "incident.updated"
        assert data4["data"]["status"] == "acknowledged"
        
        # J: Invalid incident PATCH does not broadcast
        patch_res2 = client.patch(f"/api/incidents/{incident_id}", json={"status": "invalid_status"})
        assert patch_res2.status_code == 409
        
        # I: alert.updated is broadcast after successful PATCH
        patch_alert = client.patch(f"/api/alerts/{alert_id}", json={"status": "acknowledged"})
        assert patch_alert.status_code == 200
        
        data5 = websocket.receive_json()
        assert data5["type"] == "alert.updated"
        assert data5["data"]["status"] == "acknowledged"
        
        # K: Invalid alert PATCH does not broadcast
        patch_alert2 = client.patch(f"/api/alerts/{alert_id}", json={"status": "invalid_status"})
        assert patch_alert2.status_code == 409

def test_c_multiple_clients(client):
    with client.websocket_connect("/ws/events") as ws1:
        with client.websocket_connect("/ws/events") as ws2:
            unique_id = f"EVT_WS_{uuid.uuid4().hex[:8]}"
            payload = {
                "events": [
                    {
                        "eventId": unique_id,
                        "eventType": "ROAD_DAMAGE",
                        "confidence": 0.5,
                        "timestamp": "2026-09-04T14:00:00Z"
                    }
                ]
            }
            res = client.post("/api/events", json=payload)
            assert res.status_code == 201
            assert len(res.json()["accepted"]) == 1, res.json()
            
            # Both should receive incident.created
            msg1 = ws1.receive_json()
            msg2 = ws2.receive_json()
            
            assert msg1["type"] == "incident.created"
            assert msg2["type"] == "incident.created"
            assert msg1["data"]["id"] == msg2["data"]["id"]
            
            # Since confidence is 0.5 (low severity), and it's road damage,
            # we should get exactly one road_damage alert for both.
            msg1_alert = ws1.receive_json()
            msg2_alert = ws2.receive_json()
            
            assert msg1_alert["type"] == "alert.created"
            assert msg2_alert["type"] == "alert.created"
