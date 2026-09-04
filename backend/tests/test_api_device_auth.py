"""
Step 18 — Android Device Authentication Tests (A–AI)

Uses a fresh `device_auth_client` fixture that does NOT override get_current_user
or get_authenticated_device, so real authentication logic runs end-to-end.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.deps import get_db
from app.auth.security import get_password_hash


# ---------------------------------------------------------------------------
# Fixture: real auth client (no overrides)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def device_auth_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Seed demo users only
    from app.models.users import User
    for user_data in [
        {"username": "admin",    "password": "adminpassword",    "role": "admin"},
        {"username": "traffic",  "password": "trafficpassword",  "role": "traffic_authority"},
        {"username": "municipal","password": "municipalpassword","role": "municipal_authority"},
    ]:
        if not db_session.query(User).filter(User.username == user_data["username"]).first():
            db_session.add(User(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
            ))
    db_session.commit()

    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def admin_login(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    return res.json()["accessToken"]

def admin_headers(token):
    return {"Authorization": f"Bearer {token}"}

def register_device(client, token, identifier="ANDROID-BUS-101"):
    res = client.post(
        "/api/registry/devices",
        json={"deviceIdentifier": identifier, "name": "Test Android", "deviceType": "camera", "isActive": True},
        headers=admin_headers(token),
    )
    assert res.status_code == 200, res.text
    return res.json()["id"]

def generate_key(client, token, device_id):
    res = client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    return data["apiKey"], data["deviceId"]

BASE_EVENT = {
    "eventId": "EVT_AUTH_001",
    "eventType": "POTHOLE",
    "confidence": 0.91,
    "timestamp": "2026-09-04T13:05:22Z",
    "location": {"latitude": 17.385044, "longitude": 78.486671, "accuracyMeters": 5.2},
}

def post_event(client, payload, api_key=None, extra_headers=None):
    headers = {}
    if api_key:
        headers["X-Device-Key"] = api_key
    if extra_headers:
        headers.update(extra_headers)
    return client.post("/api/events", json={"events": [payload]}, headers=headers)


# ---------------------------------------------------------------------------
# A. Admin generates device credential
# ---------------------------------------------------------------------------

def test_a_admin_generates_device_credential(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token)
    res = device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    assert res.status_code == 200
    data = res.json()
    assert "apiKey" in data
    assert "deviceId" in data
    assert data["deviceId"] == "ANDROID-BUS-101"
    assert len(data["apiKey"]) > 20  # meaningful length


# ---------------------------------------------------------------------------
# B. Plaintext key returned on creation
# ---------------------------------------------------------------------------

def test_b_plaintext_key_returned_once(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_B")
    res = device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    assert res.status_code == 200
    api_key = res.json()["apiKey"]
    assert isinstance(api_key, str) and len(api_key) > 10


# ---------------------------------------------------------------------------
# C. Hash stored, plaintext NOT stored, response never exposes hash
# ---------------------------------------------------------------------------

def test_c_hash_stored_plaintext_not_exposed(device_auth_client, db_session):
    from app.models.registry import Device as DeviceModel
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_C")

    res = device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    api_key = res.json()["apiKey"]

    # Check DB: hash is stored, not the plaintext
    db_device = db_session.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    assert db_device.api_key_hash is not None
    assert db_device.api_key_hash != api_key  # hash ≠ plaintext

    # API response must not expose hash
    get_res = device_auth_client.get(
        f"/api/registry/devices/{device_id}",
        headers=admin_headers(token),
    )
    assert "apiKeyHash" not in get_res.json()
    assert "api_key_hash" not in get_res.json()


# ---------------------------------------------------------------------------
# D. Device can authenticate using X-Device-Key
# ---------------------------------------------------------------------------

def test_d_device_can_authenticate(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_D")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_D001"}, api_key=api_key)
    assert resp.status_code == 201
    assert resp.json()["accepted"][0]["eventId"] == "EVT_D001"


# ---------------------------------------------------------------------------
# E. Missing X-Device-Key rejected
# ---------------------------------------------------------------------------

def test_e_missing_device_key_rejected(device_auth_client):
    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_E001"}, api_key=None)
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# F. Invalid X-Device-Key rejected
# ---------------------------------------------------------------------------

def test_f_invalid_device_key_rejected(device_auth_client):
    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_F001"}, api_key="totally-wrong-key")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# G. Inactive device rejected with 403
# ---------------------------------------------------------------------------

def test_g_inactive_device_rejected(device_auth_client, db_session):
    from app.models.registry import Device as DeviceModel
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_G")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    # Deactivate the device
    db_device = db_session.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    db_device.is_active = False
    db_session.commit()

    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_G001"}, api_key=api_key)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# H. Event without deviceId uses authenticated device
# ---------------------------------------------------------------------------

def test_h_event_without_device_id_uses_auth_device(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_H")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    payload = {**BASE_EVENT, "eventId": "EVT_H001"}
    payload.pop("location", None)
    payload = {
        "eventId": "EVT_H001",
        "eventType": "POTHOLE",
        "confidence": 0.91,
        "timestamp": "2026-09-04T13:05:22Z",
    }
    resp = post_event(device_auth_client, payload, api_key=api_key)
    assert resp.status_code == 201
    accepted = resp.json()["accepted"][0]
    assert accepted["deviceId"] == dev_identifier


# ---------------------------------------------------------------------------
# I. Event with matching deviceId accepted
# ---------------------------------------------------------------------------

def test_i_event_with_matching_device_id_accepted(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_I")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    payload = {**BASE_EVENT, "eventId": "EVT_I001", "deviceId": dev_identifier}
    resp = post_event(device_auth_client, payload, api_key=api_key)
    assert resp.status_code == 201
    assert resp.json()["accepted"][0]["deviceId"] == dev_identifier


# ---------------------------------------------------------------------------
# J. Event with mismatching deviceId rejected
# ---------------------------------------------------------------------------

def test_j_event_with_mismatching_device_id_rejected(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_J")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    # Submit event claiming to be a different device
    payload = {**BASE_EVENT, "eventId": "EVT_J001", "deviceId": "SOME_OTHER_DEVICE"}
    resp = post_event(device_auth_client, payload, api_key=api_key)
    assert resp.status_code == 201  # HTTP 201 with batch semantics
    data = resp.json()
    assert len(data["accepted"]) == 0
    assert len(data["errors"]) == 1
    assert "deviceId" in data["errors"][0]["field"]


# ---------------------------------------------------------------------------
# K. Device cannot impersonate another device
# ---------------------------------------------------------------------------

def test_k_device_cannot_impersonate_another(device_auth_client):
    token = admin_login(device_auth_client)
    device_id_a = register_device(device_auth_client, token, "DEV_K_A")
    device_id_b = register_device(device_auth_client, token, "DEV_K_B")
    api_key_a, _ = generate_key(device_auth_client, token, device_id_a)

    # Authenticated as DEV_K_A but claiming to be DEV_K_B
    payload = {**BASE_EVENT, "eventId": "EVT_K001", "deviceId": "DEV_K_B"}
    resp = post_event(device_auth_client, payload, api_key=api_key_a)
    assert resp.status_code == 201
    data = resp.json()
    assert len(data["accepted"]) == 0
    assert "Impersonation rejected" in data["errors"][0]["message"]


# ---------------------------------------------------------------------------
# L. Event idempotency still works
# ---------------------------------------------------------------------------

def test_l_event_idempotency_preserved(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_L")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    payload = {**BASE_EVENT, "eventId": "EVT_L001"}
    resp1 = post_event(device_auth_client, payload, api_key=api_key)
    assert resp1.status_code == 201
    assert len(resp1.json()["accepted"]) == 1

    resp2 = post_event(device_auth_client, payload, api_key=api_key)
    assert resp2.status_code == 201
    assert len(resp2.json()["duplicates"]) == 1
    assert len(resp2.json()["accepted"]) == 0


# ---------------------------------------------------------------------------
# M. Duplicate event does not overwrite original identity
# ---------------------------------------------------------------------------

def test_m_duplicate_does_not_overwrite_identity(device_auth_client, db_session):
    from app.models.events import Event
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_M")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    payload = {**BASE_EVENT, "eventId": "EVT_M001"}
    post_event(device_auth_client, payload, api_key=api_key)

    # Submit again — duplicate
    post_event(device_auth_client, payload, api_key=api_key)

    # Only one event in DB, with original device identity
    events = db_session.query(Event).filter(Event.event_id == "EVT_M001").all()
    assert len(events) == 1
    assert events[0].device_id == dev_identifier


# ---------------------------------------------------------------------------
# N. Device-created recording accepted
# ---------------------------------------------------------------------------

def test_n_device_created_recording_accepted(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_N")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_N001", "status": "available"},
        headers={"X-Device-Key": api_key},
    )
    assert res.status_code == 200
    assert res.json()["recordingId"] == "REC_N001"


# ---------------------------------------------------------------------------
# O. Recording without deviceId uses authenticated device
# ---------------------------------------------------------------------------

def test_o_recording_without_device_id_uses_auth_device(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_O")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_O001", "status": "uploading"},
        headers={"X-Device-Key": api_key},
    )
    assert res.status_code == 200
    assert res.json()["deviceId"] == dev_identifier


# ---------------------------------------------------------------------------
# P. Recording with matching deviceId accepted
# ---------------------------------------------------------------------------

def test_p_recording_with_matching_device_id_accepted(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_P")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_P001", "deviceId": dev_identifier, "status": "available"},
        headers={"X-Device-Key": api_key},
    )
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# Q. Recording with mismatching deviceId rejected
# ---------------------------------------------------------------------------

def test_q_recording_with_mismatching_device_id_rejected(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_Q")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_Q001", "deviceId": "ANOTHER_DEVICE", "status": "available"},
        headers={"X-Device-Key": api_key},
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# R. Admin can still create recordings
# ---------------------------------------------------------------------------

def test_r_admin_can_create_recordings(device_auth_client):
    token = admin_login(device_auth_client)
    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_R001", "status": "available"},
        headers=admin_headers(token),
    )
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# S. Traffic authority cannot create recordings
# ---------------------------------------------------------------------------

def test_s_traffic_cannot_create_recordings(device_auth_client):
    token = device_auth_client.post(
        "/api/auth/login", json={"username": "traffic", "password": "trafficpassword"}
    ).json()["accessToken"]
    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_S001", "status": "available"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 401  # not admin JWT, no device key → 401


# ---------------------------------------------------------------------------
# T. Municipal authority cannot create recordings
# ---------------------------------------------------------------------------

def test_t_municipal_cannot_create_recordings(device_auth_client):
    token = device_auth_client.post(
        "/api/auth/login", json={"username": "municipal", "password": "municipalpassword"}
    ).json()["accessToken"]
    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_T001", "status": "available"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# U. Device cannot PATCH recordings
# ---------------------------------------------------------------------------

def test_u_device_cannot_patch_recordings(device_auth_client):
    token = admin_login(device_auth_client)
    # Create recording as admin first
    rec_res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_U001", "status": "uploading"},
        headers=admin_headers(token),
    )
    rec_id = rec_res.json()["id"]

    # Try to PATCH as device
    device_id = register_device(device_auth_client, token, "DEV_U")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    patch_res = device_auth_client.patch(
        f"/api/recordings/{rec_id}",
        json={"status": "available"},
        headers={"X-Device-Key": api_key},
    )
    assert patch_res.status_code == 403


# ---------------------------------------------------------------------------
# V. Admin can PATCH recordings
# ---------------------------------------------------------------------------

def test_v_admin_can_patch_recordings(device_auth_client):
    token = admin_login(device_auth_client)
    rec_res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_V001", "status": "uploading"},
        headers=admin_headers(token),
    )
    rec_id = rec_res.json()["id"]

    patch_res = device_auth_client.patch(
        f"/api/recordings/{rec_id}",
        json={"status": "available"},
        headers=admin_headers(token),
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "available"


# ---------------------------------------------------------------------------
# W. lastSeenAt updated after successful event
# ---------------------------------------------------------------------------

def test_w_last_seen_at_updated_after_event(device_auth_client, db_session):
    from app.models.registry import Device as DeviceModel
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_W")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    db_device = db_session.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    assert db_device.last_seen_at is None

    post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_W001"}, api_key=api_key)

    db_session.refresh(db_device)
    assert db_device.last_seen_at is not None


# ---------------------------------------------------------------------------
# X. lastSeenAt updated after successful recording
# ---------------------------------------------------------------------------

def test_x_last_seen_at_updated_after_recording(device_auth_client, db_session):
    from app.models.registry import Device as DeviceModel
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_X")
    api_key, _ = generate_key(device_auth_client, token, device_id)

    db_device = db_session.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    assert db_device.last_seen_at is None

    device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_X001", "status": "available"},
        headers={"X-Device-Key": api_key},
    )

    db_session.refresh(db_device)
    assert db_device.last_seen_at is not None


# ---------------------------------------------------------------------------
# Y. lastSeenAt does NOT change on failed authentication
# ---------------------------------------------------------------------------

def test_y_last_seen_at_unchanged_on_failed_auth(device_auth_client, db_session):
    from app.models.registry import Device as DeviceModel
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_Y")
    # Do NOT generate credentials — device has no key

    post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_Y001"}, api_key="wrong-key")

    db_device = db_session.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    assert db_device.last_seen_at is None


# ---------------------------------------------------------------------------
# Z. Credential regeneration invalidates old key
# ---------------------------------------------------------------------------

def test_z_regeneration_invalidates_old_key(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_Z")
    old_key, _ = generate_key(device_auth_client, token, device_id)

    # Old key works
    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_Z001"}, api_key=old_key)
    assert resp.status_code == 201

    # Regenerate
    new_res = device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    new_key = new_res.json()["apiKey"]

    # Old key now fails
    resp_old = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_Z002"}, api_key=old_key)
    assert resp_old.status_code == 401


# ---------------------------------------------------------------------------
# AA. New regenerated key works
# ---------------------------------------------------------------------------

def test_aa_new_regenerated_key_works(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_AA")
    generate_key(device_auth_client, token, device_id)  # generate first key

    # Regenerate
    new_res = device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    new_key = new_res.json()["apiKey"]

    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_AA001"}, api_key=new_key)
    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# AB. Old key fails after regeneration (same as Z but explicit test)
# ---------------------------------------------------------------------------

def test_ab_old_key_fails_after_regeneration(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_AB")
    old_key, _ = generate_key(device_auth_client, token, device_id)

    # Regenerate
    device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )

    resp = post_event(device_auth_client, {**BASE_EVENT, "eventId": "EVT_AB001"}, api_key=old_key)
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# AC. API responses never expose plaintext/hash
# ---------------------------------------------------------------------------

def test_ac_responses_never_expose_key_or_hash(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_AC")
    cred_res = device_auth_client.post(
        f"/api/registry/devices/{device_id}/credentials",
        headers=admin_headers(token),
    )
    # Credential endpoint returns plaintext ONCE — that's by design
    assert "apiKey" in cred_res.json()

    # All other GET endpoints must NOT expose the key or hash
    get_res = device_auth_client.get(f"/api/registry/devices/{device_id}", headers=admin_headers(token))
    body = get_res.json()
    assert "apiKey" not in body
    assert "apiKeyHash" not in body
    assert "api_key_hash" not in body


# ---------------------------------------------------------------------------
# AD. Existing JWT dashboard authentication remains functional
# ---------------------------------------------------------------------------

def test_ad_jwt_dashboard_auth_still_works(device_auth_client):
    token = admin_login(device_auth_client)
    res = device_auth_client.get("/api/incidents", headers=admin_headers(token))
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# AE. Existing registry behavior remains functional
# ---------------------------------------------------------------------------

def test_ae_registry_behavior_unchanged(device_auth_client):
    token = admin_login(device_auth_client)
    assert device_auth_client.get("/api/registry/routes", headers=admin_headers(token)).status_code == 200
    assert device_auth_client.get("/api/registry/buses", headers=admin_headers(token)).status_code == 200
    assert device_auth_client.get("/api/registry/devices", headers=admin_headers(token)).status_code == 200


# ---------------------------------------------------------------------------
# AF. POST /api/events without authentication returns 401
# ---------------------------------------------------------------------------

def test_af_unauthenticated_events_rejected(device_auth_client):
    payload = {
        "events": [{
            "eventId": "EVT_AF001",
            "eventType": "POTHOLE",
            "confidence": 0.9,
            "timestamp": "2026-09-04T12:00:00Z",
        }]
    }
    res = device_auth_client.post("/api/events", json=payload)
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# AG. Existing recording behavior remains functional for admin
# ---------------------------------------------------------------------------

def test_ag_admin_recording_behavior_unchanged(device_auth_client):
    token = admin_login(device_auth_client)
    res = device_auth_client.post(
        "/api/recordings",
        json={"recordingId": "REC_AG001", "status": "available"},
        headers=admin_headers(token),
    )
    assert res.status_code == 200
    rec_id = res.json()["id"]

    get_res = device_auth_client.get(f"/api/recordings/{rec_id}", headers=admin_headers(token))
    assert get_res.status_code == 200
    assert get_res.json()["recordingId"] == "REC_AG001"


# ---------------------------------------------------------------------------
# AH. Batch event authentication — whole batch uses one device key
# ---------------------------------------------------------------------------

def test_ah_batch_event_authentication(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_AH")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    payload = {
        "events": [
            {**BASE_EVENT, "eventId": "EVT_AH001"},
            {**BASE_EVENT, "eventId": "EVT_AH002"},
            {**BASE_EVENT, "eventId": "EVT_AH003"},
        ]
    }
    res = device_auth_client.post("/api/events", json=payload, headers={"X-Device-Key": api_key})
    assert res.status_code == 201
    data = res.json()
    assert len(data["accepted"]) == 3
    for accepted in data["accepted"]:
        assert accepted["deviceId"] == dev_identifier


# ---------------------------------------------------------------------------
# AI. Partial batch failures preserve existing semantics
# ---------------------------------------------------------------------------

def test_ai_partial_batch_failures_preserve_semantics(device_auth_client):
    token = admin_login(device_auth_client)
    device_id = register_device(device_auth_client, token, "DEV_AI")
    api_key, dev_identifier = generate_key(device_auth_client, token, device_id)

    # Submit first event to create duplicate
    device_auth_client.post(
        "/api/events",
        json={"events": [{**BASE_EVENT, "eventId": "EVT_AI001"}]},
        headers={"X-Device-Key": api_key},
    )

    # Batch: valid, duplicate, impersonation, invalid confidence
    payload = {
        "events": [
            {**BASE_EVENT, "eventId": "EVT_AI002"},               # new — accepted
            {**BASE_EVENT, "eventId": "EVT_AI001"},               # duplicate
            {**BASE_EVENT, "eventId": "EVT_AI003", "deviceId": "OTHER_DEV"},  # impersonation → error
            {**BASE_EVENT, "eventId": "EVT_AI004", "confidence": 1.5},        # invalid → error
        ]
    }
    res = device_auth_client.post("/api/events", json=payload, headers={"X-Device-Key": api_key})
    assert res.status_code == 201
    data = res.json()
    assert len(data["accepted"]) == 1
    assert data["accepted"][0]["eventId"] == "EVT_AI002"
    assert len(data["duplicates"]) == 1
    assert len(data["errors"]) == 2
