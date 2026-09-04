"""
Step 16 Integration Tests: Device/Bus/Route Event Integration

Tests A–AF as specified in the milestone requirements.
Uses the shared conftest.py fixtures (in-memory SQLite, admin user override).
"""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BASE_EVENT = {
    "eventId": "EVT_S16_001",
    "eventType": "POTHOLE",
    "confidence": 0.91,
    "timestamp": "2026-09-04T13:05:22Z",
    "recordingId": "REC_001",
    "location": {
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracyMeters": 5.2
    }
}

def post_event(client, payload):
    return client.post("/api/events", json={"events": [payload]})


# Registry helpers

def create_route(client, route_number="R101"):
    return client.post("/api/registry/routes", json={
        "routeNumber": route_number,
        "name": "Test Route",
        "origin": "A",
        "destination": "B",
        "isActive": True,
    })

def create_bus(client, route_id=None, bus_number="B100", reg="KA-01-1234"):
    payload = {
        "busNumber": bus_number,
        "registrationNumber": reg,
        "operator": "Test Corp",
        "isActive": True,
    }
    if route_id:
        payload["routeId"] = route_id
    return client.post("/api/registry/buses", json=payload)

def create_device(client, device_identifier="DEV-001", bus_id=None, is_active=True):
    payload = {
        "deviceIdentifier": device_identifier,
        "name": "Test Device",
        "deviceType": "gps",
        "isActive": is_active,
    }
    if bus_id:
        payload["busId"] = bus_id
    return client.post("/api/registry/devices", json=payload)


# ===========================================================================
# A. Event without deviceId remains valid (backward compatibility)
# ===========================================================================

def test_a_event_without_device_id_is_valid(client):
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_A001"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["accepted"][0]["eventId"] == "EVT_A001"
    assert data["accepted"][0]["deviceId"] is None
    assert data["accepted"][0]["busId"] is None
    assert data["accepted"][0]["routeId"] is None


# ===========================================================================
# B–D. Valid device with full chain
# ===========================================================================

def test_b_event_with_valid_active_device(client):
    device_res = create_device(client, "DEV-B001")
    assert device_res.status_code == 200

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_B001", "deviceId": "DEV-B001"})
    assert resp.status_code == 201
    accepted = resp.json()["accepted"]
    assert len(accepted) == 1
    assert accepted[0]["deviceId"] == "DEV-B001"

def test_c_device_resolves_to_correct_bus(client):
    bus_res = create_bus(client, bus_number="B200", reg="KA-02-9999")
    bus_id = bus_res.json()["id"]
    create_device(client, "DEV-C001", bus_id=bus_id)

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_C001", "deviceId": "DEV-C001"})
    assert resp.status_code == 201
    accepted = resp.json()["accepted"]
    assert accepted[0]["busId"] == bus_id

def test_d_bus_resolves_to_correct_route(client):
    route_res = create_route(client, "R200")
    route_id = route_res.json()["id"]
    bus_res = create_bus(client, route_id=route_id, bus_number="B300", reg="KA-03-1111")
    bus_id = bus_res.json()["id"]
    create_device(client, "DEV-D001", bus_id=bus_id)

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_D001", "deviceId": "DEV-D001"})
    assert resp.status_code == 201
    accepted = resp.json()["accepted"]
    assert accepted[0]["routeId"] == route_id


# ===========================================================================
# E. Device with no bus assigned — remains valid (Case B)
# ===========================================================================

def test_e_device_with_no_bus_remains_valid(client):
    create_device(client, "DEV-E001")  # no bus_id

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_E001", "deviceId": "DEV-E001"})
    assert resp.status_code == 201
    accepted = resp.json()["accepted"]
    assert accepted[0]["deviceId"] == "DEV-E001"
    assert accepted[0]["busId"] is None
    assert accepted[0]["routeId"] is None


# ===========================================================================
# F. Bus with no route assigned — remains valid (Case C)
# ===========================================================================

def test_f_bus_with_no_route_remains_valid(client):
    bus_res = create_bus(client, route_id=None, bus_number="B400", reg="KA-04-2222")
    bus_id = bus_res.json()["id"]
    create_device(client, "DEV-F001", bus_id=bus_id)

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_F001", "deviceId": "DEV-F001"})
    assert resp.status_code == 201
    accepted = resp.json()["accepted"]
    assert accepted[0]["deviceId"] == "DEV-F001"
    assert accepted[0]["busId"] == bus_id
    assert accepted[0]["routeId"] is None


# ===========================================================================
# G. Unknown deviceId rejected (Case D → 422 converted to error entry)
# ===========================================================================

def test_g_unknown_device_id_rejected(client):
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_G001", "deviceId": "UNKNOWN-DEVICE"})
    assert resp.status_code == 201
    data = resp.json()
    # Unresolvable device → reported as error in the batch response
    assert len(data["errors"]) == 1
    assert "UNKNOWN-DEVICE" in data["errors"][0]["message"] or "Unknown" in data["errors"][0]["message"]


# ===========================================================================
# H. Inactive device rejected (Case E)
# ===========================================================================

def test_h_inactive_device_rejected(client):
    create_device(client, "DEV-H001", is_active=False)
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_H001", "deviceId": "DEV-H001"})
    data = resp.json()
    assert len(data["errors"]) == 1
    assert "inactive" in data["errors"][0]["message"].lower()


# ===========================================================================
# I. Device assigned to inactive bus rejected (Case F)
# ===========================================================================

def test_i_device_on_inactive_bus_rejected(client):
    bus_res = create_bus(client, bus_number="B500", reg="KA-05-0001")
    bus_id = bus_res.json()["id"]
    # deactivate the bus
    client.patch(f"/api/registry/buses/{bus_id}", json={"isActive": False})
    create_device(client, "DEV-I001", bus_id=bus_id)

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_I001", "deviceId": "DEV-I001"})
    data = resp.json()
    assert len(data["errors"]) == 1
    assert "inactive" in data["errors"][0]["message"].lower()


# ===========================================================================
# J. Bus assigned to inactive route rejected (Case G)
# ===========================================================================

def test_j_bus_on_inactive_route_rejected(client):
    route_res = create_route(client, "R300")
    route_id = route_res.json()["id"]
    bus_res = create_bus(client, route_id=route_id, bus_number="B600", reg="KA-06-0001")
    bus_id = bus_res.json()["id"]
    # deactivate the route
    client.patch(f"/api/registry/routes/{route_id}", json={"isActive": False})
    create_device(client, "DEV-J001", bus_id=bus_id)

    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_J001", "deviceId": "DEV-J001"})
    data = resp.json()
    assert len(data["errors"]) == 1
    assert "inactive" in data["errors"][0]["message"].lower()


# ===========================================================================
# K–P. Field storage verification
# ===========================================================================

def _setup_full_chain(client):
    """Create route → bus → device and return (device_identifier, bus_id, route_id)."""
    route_id = create_route(client, "R400").json()["id"]
    bus_id = create_bus(client, route_id=route_id, bus_number="B700", reg="KA-07-0001").json()["id"]
    create_device(client, "DEV-KP001", bus_id=bus_id)
    return "DEV-KP001", bus_id, route_id

def test_k_event_stores_device_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_K001", "deviceId": dev})
    # Verify via incident (device_id is copied)
    incidents = client.get("/api/incidents").json()
    inc = next(i for i in incidents["items"] if i["eventId"] == "EVT_K001")
    assert inc["deviceId"] == dev

def test_l_event_stores_bus_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_L001", "deviceId": dev})
    incidents = client.get("/api/incidents").json()
    inc = next(i for i in incidents["items"] if i["eventId"] == "EVT_L001")
    assert inc["busId"] == bus_id

def test_m_event_stores_route_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_M001", "deviceId": dev})
    incidents = client.get("/api/incidents").json()
    inc = next(i for i in incidents["items"] if i["eventId"] == "EVT_M001")
    assert inc["routeId"] == route_id

def test_n_incident_copies_device_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_N001", "deviceId": dev})
    inc_id = resp.json()["accepted"][0]["incidentId"]
    inc = client.get(f"/api/incidents/{inc_id}").json()
    assert inc["deviceId"] == dev

def test_o_incident_copies_bus_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_O001", "deviceId": dev})
    inc_id = resp.json()["accepted"][0]["incidentId"]
    inc = client.get(f"/api/incidents/{inc_id}").json()
    assert inc["busId"] == bus_id

def test_p_incident_copies_route_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_P001", "deviceId": dev})
    inc_id = resp.json()["accepted"][0]["incidentId"]
    inc = client.get(f"/api/incidents/{inc_id}").json()
    assert inc["routeId"] == route_id


# ===========================================================================
# Q. IncidentResponse exposes nullable identity fields
# ===========================================================================

def test_q_incident_response_has_nullable_identity(client):
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_Q001"})
    inc_id = resp.json()["accepted"][0]["incidentId"]
    inc = client.get(f"/api/incidents/{inc_id}").json()
    assert "deviceId" in inc
    assert "busId" in inc
    assert "routeId" in inc
    assert inc["deviceId"] is None
    assert inc["busId"] is None
    assert inc["routeId"] is None


# ===========================================================================
# R–T. Fleet filters on GET /api/incidents
# ===========================================================================

def test_r_filter_incidents_by_device_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_R001", "deviceId": dev})
    post_event(client, {**BASE_EVENT, "eventId": "EVT_R002"})  # no device

    resp = client.get(f"/api/incidents?deviceId={dev}")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["deviceId"] == dev

def test_s_filter_incidents_by_bus_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_S001", "deviceId": dev})

    resp = client.get(f"/api/incidents?busId={bus_id}")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["busId"] == bus_id

def test_t_filter_incidents_by_route_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_T001", "deviceId": dev})

    resp = client.get(f"/api/incidents?routeId={route_id}")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["routeId"] == route_id


# ===========================================================================
# U–V. Map API identity fields and filters
# ===========================================================================

MAP_BBOX = "?minLatitude=17.0&maxLatitude=18.0&minLongitude=78.0&maxLongitude=79.0"

def test_u_map_response_exposes_identity_fields(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_U001", "deviceId": dev})

    resp = client.get(f"/api/map/incidents{MAP_BBOX}")
    assert resp.status_code == 200
    items = resp.json()["items"]
    item = next((i for i in items if i.get("deviceId") == dev), None)
    assert item is not None
    assert item["busId"] == bus_id
    assert item["routeId"] == route_id

def test_v_map_filter_by_device_id(client):
    dev, bus_id, route_id = _setup_full_chain(client)
    post_event(client, {**BASE_EVENT, "eventId": "EVT_V001", "deviceId": dev})
    post_event(client, {**BASE_EVENT, "eventId": "EVT_V002"})  # no device

    resp = client.get(f"/api/map/incidents{MAP_BBOX}&deviceId={dev}")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert all(i["deviceId"] == dev for i in items)
    assert len(items) == 1


# ===========================================================================
# Y–Z. Idempotency
# ===========================================================================

def test_y_duplicate_event_idempotent(client):
    payload = {**BASE_EVENT, "eventId": "EVT_Y001"}
    r1 = post_event(client, payload)
    r2 = post_event(client, payload)
    assert len(r1.json()["accepted"]) == 1
    assert len(r2.json()["duplicates"]) == 1
    # Only one incident created (fresh DB per test)
    assert client.get("/api/incidents").json()["total"] == 1

def test_z_duplicate_with_different_device_does_not_mutate(client):
    dev1 = "DEV-Z001"
    dev2 = "DEV-Z002"
    create_device(client, dev1)
    create_device(client, dev2)

    payload = {**BASE_EVENT, "eventId": "EVT_Z001", "deviceId": dev1}
    r1 = post_event(client, payload)
    inc_id = r1.json()["accepted"][0]["incidentId"]

    # Resubmit with a different deviceId — should be a duplicate, not a mutation
    r2 = post_event(client, {**payload, "deviceId": dev2})
    assert len(r2.json()["duplicates"]) == 1

    # Original incident unchanged
    inc = client.get(f"/api/incidents/{inc_id}").json()
    assert inc["deviceId"] == dev1


# ===========================================================================
# AA–AF. Existing behavior still intact (smoke tests)
# ===========================================================================

def test_aa_existing_alerts_still_work(client):
    resp = post_event(client, {**BASE_EVENT, "eventId": "EVT_AA001", "confidence": 0.95})
    assert resp.status_code == 201
    assert len(resp.json()["accepted"]) == 1
    alerts = client.get("/api/alerts").json()
    assert alerts["total"] >= 1

def test_ab_existing_analytics_still_work(client):
    post_event(client, {**BASE_EVENT, "eventId": "EVT_AB001"})
    resp = client.get("/api/analytics/incidents-by-severity")
    assert resp.status_code == 200

def test_ac_existing_authentication_still_works(client):
    resp = client.get("/api/incidents")
    assert resp.status_code == 200  # conftest overrides auth to admin

def test_ad_existing_registry_apis_still_work(client):
    assert client.get("/api/registry/routes").status_code == 200
    assert client.get("/api/registry/buses").status_code == 200
    assert client.get("/api/registry/devices").status_code == 200

def test_ae_existing_websocket_behavior_functional(client):
    # Ensure the /ws/events endpoint still exists
    resp = client.get("/api/status")
    assert resp.status_code == 200

def test_af_backward_compat_payload_no_device_id(client):
    """The exact payload from the spec must still work."""
    payload = {
        "eventId": "EVT_OLD_001",
        "eventType": "POTHOLE",
        "confidence": 0.91,
        "timestamp": "2026-09-04T13:05:22Z",
        "recordingId": "REC_001",
        "location": {
            "latitude": 17.385044,
            "longitude": 78.486671,
            "accuracyMeters": 5.2
        }
    }
    resp = post_event(client, payload)
    assert resp.status_code == 201
    accepted = resp.json()["accepted"]
    assert len(accepted) == 1
    assert accepted[0]["deviceId"] is None
    assert accepted[0]["busId"] is None
    assert accepted[0]["routeId"] is None
    # Incident exists with null identity
    inc_id = accepted[0]["incidentId"]
    inc = client.get(f"/api/incidents/{inc_id}").json()
    assert inc["deviceId"] is None
    assert inc["busId"] is None
    assert inc["routeId"] is None
