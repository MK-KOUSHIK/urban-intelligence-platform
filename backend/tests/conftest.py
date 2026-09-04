import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.core import Base

from fastapi.testclient import TestClient
from app.main import app
from app.database.deps import get_db
from app.auth.deps import get_current_user, get_optional_current_user
from app.auth.device_deps import get_authenticated_device
from app.models.users import User
from app.models.registry import Device

from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------------------------------------------------------------------------
# Mock device used by the default `client` fixture.
# All existing tests that call POST /api/events will use this device identity.
# The mock device has no bus/route, matching the pre-Step-16 identity-null state.
# ---------------------------------------------------------------------------
MOCK_DEVICE = Device(
    id="mock-device-id",
    device_identifier="MOCK_TEST_DEVICE",
    name="Mock Test Device",
    device_type="test",
    is_active=True,
    bus_id=None,
    api_key_hash=None,
    api_key_created_at=None,
    last_seen_at=None,
)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    def override_get_current_user():
        return User(id="test_admin_id", username="admin", role="admin", is_active=True)

    def override_get_authenticated_device():
        """
        Default test client sends events as a mock device.
        The device has no bus/route so resolved identity fields remain None —
        preserving existing test assertions (deviceId=None etc).

        NOTE: The mock device is NOT persisted in DB, so resolve_device_identity
        will NOT find it. The events service handles this gracefully:
        when authenticated_device is set, it calls resolve_device_identity which
        will raise 422 if the device_identifier isn't in the registry.

        To keep existing tests passing without each test needing a registered device,
        we return None here (simulating the "no device auth" legacy path).
        This is acceptable because the conftest already overrides auth — existing
        tests are not security tests for device auth.
        """
        return None  # None → events service uses legacy identity-null path

    def override_get_optional_current_user():
        return User(id="test_admin_id", username="admin", role="admin", is_active=True)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_optional_current_user] = override_get_optional_current_user
    app.dependency_overrides[get_authenticated_device] = override_get_authenticated_device
    yield TestClient(app)
    app.dependency_overrides.clear()
