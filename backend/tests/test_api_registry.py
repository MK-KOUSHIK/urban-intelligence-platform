import pytest
from fastapi.testclient import TestClient
from app.models.users import User
from app.auth.deps import get_current_user

# All tests use the `client` fixture from conftest.py, which:
# - Uses an in-memory SQLite DB (fresh per test)
# - Overrides get_current_user to return an admin user

# Helper to build a non-admin client override
def make_client_with_role(app, db_session, role: str):
    """Return a TestClient with get_current_user overridden to a specific role."""
    from app.database.deps import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return User(id=f"user_{role}", username=role, role=role, is_active=True)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    return TestClient(app)


# ===========================================================================
# ROUTE TESTS
# ===========================================================================

def test_create_route_as_admin(client):
    response = client.post("/api/registry/routes", json={
        "routeNumber": "101",
        "name": "Downtown Express",
        "origin": "North Station",
        "destination": "South Station",
        "isActive": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["routeNumber"] == "101"
    assert data["name"] == "Downtown Express"
    assert "id" in data

def test_create_route_duplicate_409(client):
    payload = {
        "routeNumber": "101",
        "name": "Downtown Express",
        "origin": "North Station",
        "destination": "South Station"
    }
    client.post("/api/registry/routes", json=payload)
    response = client.post("/api/registry/routes", json=payload)
    assert response.status_code == 409

def test_get_routes_as_admin(client):
    client.post("/api/registry/routes", json={
        "routeNumber": "101",
        "name": "Downtown Express",
        "origin": "North",
        "destination": "South"
    })
    response = client.get("/api/registry/routes")
    assert response.status_code == 200
    assert len(response.json()) == 1

def test_get_route_by_id(client):
    create_resp = client.post("/api/registry/routes", json={
        "routeNumber": "102",
        "name": "Airport Shuttle",
        "origin": "City Center",
        "destination": "Airport"
    })
    route_id = create_resp.json()["id"]
    response = client.get(f"/api/registry/routes/{route_id}")
    assert response.status_code == 200
    assert response.json()["routeNumber"] == "102"

def test_get_route_not_found(client):
    response = client.get("/api/registry/routes/non-existent-id")
    assert response.status_code == 404

def test_update_route(client):
    create_resp = client.post("/api/registry/routes", json={
        "routeNumber": "103",
        "name": "Old Name",
        "origin": "A",
        "destination": "B"
    })
    route_id = create_resp.json()["id"]
    response = client.patch(f"/api/registry/routes/{route_id}", json={
        "name": "New Name",
        "isActive": False
    })
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["isActive"] is False

def test_update_route_duplicate_number_409(client):
    client.post("/api/registry/routes", json={
        "routeNumber": "201",
        "name": "Route A",
        "origin": "X",
        "destination": "Y"
    })
    r2 = client.post("/api/registry/routes", json={
        "routeNumber": "202",
        "name": "Route B",
        "origin": "X",
        "destination": "Z"
    })
    route_id = r2.json()["id"]
    response = client.patch(f"/api/registry/routes/{route_id}", json={"routeNumber": "201"})
    assert response.status_code == 409

def test_create_route_forbidden_for_non_admin(client, db_session):
    from app.main import app as fastapi_app
    non_admin = make_client_with_role(fastapi_app, db_session, "traffic_authority")
    response = non_admin.post("/api/registry/routes", json={
        "routeNumber": "999",
        "name": "Forbidden",
        "origin": "A",
        "destination": "B"
    })
    assert response.status_code == 403

def test_read_routes_allowed_for_traffic_authority(client, db_session):
    # First create a route as admin (client fixture)
    client.post("/api/registry/routes", json={
        "routeNumber": "301",
        "name": "Express",
        "origin": "A",
        "destination": "B"
    })
    from app.main import app as fastapi_app
    ta_client = make_client_with_role(fastapi_app, db_session, "traffic_authority")
    response = ta_client.get("/api/registry/routes")
    assert response.status_code == 200

def test_read_routes_allowed_for_municipal_authority(client, db_session):
    from app.main import app as fastapi_app
    ma_client = make_client_with_role(fastapi_app, db_session, "municipal_authority")
    response = ma_client.get("/api/registry/routes")
    assert response.status_code == 200


# ===========================================================================
# BUS TESTS
# ===========================================================================

def test_create_bus_without_route(client):
    response = client.post("/api/registry/buses", json={
        "busNumber": "B100",
        "registrationNumber": "KA-01-1234",
        "operator": "City Transit"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["busNumber"] == "B100"
    assert data["routeId"] is None

def test_create_bus_with_valid_route(client):
    route_res = client.post("/api/registry/routes", json={
        "routeNumber": "101",
        "name": "Downtown",
        "origin": "North",
        "destination": "South"
    })
    route_id = route_res.json()["id"]

    response = client.post("/api/registry/buses", json={
        "busNumber": "B200",
        "registrationNumber": "KA-02-5678",
        "operator": "Metro Corp",
        "routeId": route_id
    })
    assert response.status_code == 200
    assert response.json()["routeId"] == route_id

def test_create_bus_invalid_route_404(client):
    response = client.post("/api/registry/buses", json={
        "busNumber": "B300",
        "registrationNumber": "KA-03-9999",
        "operator": "City Transit",
        "routeId": "non-existent-route-id"
    })
    assert response.status_code == 404

def test_create_bus_duplicate_number_409(client):
    payload = {
        "busNumber": "B100",
        "registrationNumber": "KA-04-1111",
        "operator": "City Transit"
    }
    client.post("/api/registry/buses", json=payload)
    payload2 = dict(payload)
    payload2["registrationNumber"] = "KA-04-2222"
    response = client.post("/api/registry/buses", json=payload2)
    assert response.status_code == 409

def test_create_bus_duplicate_registration_409(client):
    client.post("/api/registry/buses", json={
        "busNumber": "B101",
        "registrationNumber": "KA-05-0001",
        "operator": "City Transit"
    })
    response = client.post("/api/registry/buses", json={
        "busNumber": "B102",
        "registrationNumber": "KA-05-0001",
        "operator": "City Transit"
    })
    assert response.status_code == 409

def test_get_bus_by_id(client):
    create_res = client.post("/api/registry/buses", json={
        "busNumber": "B400",
        "registrationNumber": "KA-06-9999",
        "operator": "Metro"
    })
    bus_id = create_res.json()["id"]
    response = client.get(f"/api/registry/buses/{bus_id}")
    assert response.status_code == 200
    assert response.json()["busNumber"] == "B400"

def test_get_bus_not_found(client):
    response = client.get("/api/registry/buses/non-existent-id")
    assert response.status_code == 404

def test_update_bus(client):
    create_res = client.post("/api/registry/buses", json={
        "busNumber": "B500",
        "registrationNumber": "KA-07-0001",
        "operator": "Old Operator"
    })
    bus_id = create_res.json()["id"]
    response = client.patch(f"/api/registry/buses/{bus_id}", json={
        "operator": "New Operator",
        "isActive": False
    })
    assert response.status_code == 200
    assert response.json()["operator"] == "New Operator"
    assert response.json()["isActive"] is False

def test_create_bus_forbidden_for_non_admin(client, db_session):
    from app.main import app as fastapi_app
    non_admin = make_client_with_role(fastapi_app, db_session, "municipal_authority")
    response = non_admin.post("/api/registry/buses", json={
        "busNumber": "B999",
        "registrationNumber": "KA-99-0000",
        "operator": "Not Allowed"
    })
    assert response.status_code == 403


# ===========================================================================
# DEVICE TESTS
# ===========================================================================

def test_create_device_without_bus(client):
    response = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-001",
        "name": "GPS Unit",
        "deviceType": "gps"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["deviceIdentifier"] == "DEV-001"
    assert data["busId"] is None

def test_create_device_with_valid_bus(client):
    bus_res = client.post("/api/registry/buses", json={
        "busNumber": "B100",
        "registrationNumber": "KA-01-1234",
        "operator": "City Transit"
    })
    bus_id = bus_res.json()["id"]

    response = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-002",
        "name": "Front Camera",
        "deviceType": "camera",
        "busId": bus_id
    })
    assert response.status_code == 200
    assert response.json()["busId"] == bus_id

def test_create_device_invalid_bus_404(client):
    response = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-003",
        "name": "Sensor",
        "deviceType": "accelerometer",
        "busId": "non-existent-bus-id"
    })
    assert response.status_code == 404

def test_create_device_duplicate_identifier_409(client):
    client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-001",
        "name": "GPS Unit",
        "deviceType": "gps"
    })
    response = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-001",
        "name": "Another GPS",
        "deviceType": "gps"
    })
    assert response.status_code == 409

def test_get_device_by_id(client):
    create_res = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-004",
        "name": "Back Camera",
        "deviceType": "camera"
    })
    device_id = create_res.json()["id"]
    response = client.get(f"/api/registry/devices/{device_id}")
    assert response.status_code == 200
    assert response.json()["deviceIdentifier"] == "DEV-004"

def test_get_device_not_found(client):
    response = client.get("/api/registry/devices/non-existent-id")
    assert response.status_code == 404

def test_update_device(client):
    create_res = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-005",
        "name": "Old Name",
        "deviceType": "gps"
    })
    device_id = create_res.json()["id"]
    response = client.patch(f"/api/registry/devices/{device_id}", json={
        "name": "Updated GPS",
        "isActive": False
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Updated GPS"
    assert response.json()["isActive"] is False

def test_update_device_with_valid_bus(client):
    bus_res = client.post("/api/registry/buses", json={
        "busNumber": "B200",
        "registrationNumber": "KA-02-5678",
        "operator": "Metro"
    })
    bus_id = bus_res.json()["id"]

    device_res = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-006",
        "name": "Vibration Sensor",
        "deviceType": "accelerometer"
    })
    device_id = device_res.json()["id"]

    response = client.patch(f"/api/registry/devices/{device_id}", json={"busId": bus_id})
    assert response.status_code == 200
    assert response.json()["busId"] == bus_id

def test_update_device_with_invalid_bus_404(client):
    device_res = client.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-007",
        "name": "Temp Sensor",
        "deviceType": "temperature"
    })
    device_id = device_res.json()["id"]
    response = client.patch(f"/api/registry/devices/{device_id}", json={"busId": "bad-bus-id"})
    assert response.status_code == 404

def test_create_device_forbidden_for_non_admin(client, db_session):
    from app.main import app as fastapi_app
    non_admin = make_client_with_role(fastapi_app, db_session, "traffic_authority")
    response = non_admin.post("/api/registry/devices", json={
        "deviceIdentifier": "DEV-999",
        "name": "Forbidden Device",
        "deviceType": "gps"
    })
    assert response.status_code == 403

def test_get_all_lists(client):
    """Smoke test: all three list endpoints return 200."""
    assert client.get("/api/registry/routes").status_code == 200
    assert client.get("/api/registry/buses").status_code == 200
    assert client.get("/api/registry/devices").status_code == 200
