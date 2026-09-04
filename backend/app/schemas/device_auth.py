from pydantic import BaseModel


class DeviceCredentialResponse(BaseModel):
    """
    Returned ONCE when an admin generates a device API key.
    The plaintext apiKey is never stored in the database.
    After this response is delivered, the backend cannot retrieve the original key.
    """
    deviceId: str   # device_identifier (human-readable, e.g. "ANDROID-BUS-101")
    apiKey: str     # plaintext key — store securely; backend only keeps the hash
