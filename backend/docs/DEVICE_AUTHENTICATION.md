# Device Authentication Architecture

This document describes the design and implementation of Android Device Authentication in the Urban Intelligence Platform backend (Step 18).

## Overview

The backend uses a dual-authentication architecture:
1.  **Human Users (Dashboard):** Use standard JWT tokens (`Authorization: Bearer <JWT>`).
2.  **Sensing Devices (Android):** Use static API keys passed in headers (`X-Device-Key: <api_key>`).

This separation ensures devices do not need complex login flows or token refresh logic while maintaining security and preventing device impersonation.

## Data Model

The `Device` table in the registry includes three authentication-related fields:
-   `api_key_hash`: A nullable string storing the bcrypt hash of the device's API key. **The raw API key is NEVER stored in plaintext in the database.**
-   `api_key_created_at`: Timestamp of when the current API key was generated.
-   `last_seen_at`: Timestamp updated whenever the device successfully authenticates an ingestion request.

## Key Generation

Administrators can generate credentials for a specific device using the following API:

`POST /api/registry/devices/{id}/credentials`

This endpoint:
1.  Generates a cryptographically secure random string with a predefined prefix (e.g., `uip_dev_...`).
2.  Hashes the key using bcrypt.
3.  Stores the hash and generation timestamp in the database.
4.  Returns the raw key to the client **exactly once**.

The dashboard frontend should present this key to the user (or display it as a QR code) for provisioning onto the Android device.

## Authentication Process

When an Android device makes a request to an ingestion endpoint (e.g., `POST /api/events` or `POST /api/recordings`):

1.  It includes the header: `X-Device-Key: uip_dev_...`.
2.  The backend's `verify_device_key` dependency extracts the key.
3.  The backend queries the `Device` table to find all devices where `api_key_hash` is not null.
4.  It uses bcrypt's `verify` function to check the provided key against the stored hashes.
    *   *Note on Performance:* Hashing is computationally expensive by design. Future optimizations might include caching hashes or introducing a `Key ID` prefix to avoid O(N) verification if the fleet grows significantly.
5.  If verified, the authenticated `Device` object is injected into the route handler.

## Ingestion Endpoints (Dual-Auth)

Ingestion APIs are protected by a hybrid dependency: `get_optional_current_user`.

This dependency checks for both `X-Device-Key` and `Authorization` headers.
- If `X-Device-Key` is present, it delegates to `verify_device_key`.
- If `Authorization` is present, it delegates to `get_current_user` (JWT).
- If neither is present, it raises a `401 Unauthorized`.

This allows administrators (via Postman or scripts) to test ingestion endpoints using their JWT, while devices use their API key.

## Identity Enforcement & Anti-Spoofing

The `EventsService` enforces strict identity checks when processing batches:

1.  **Impersonation Protection:** If the request was authenticated via `X-Device-Key` and the event payload includes a `deviceId` that does NOT match the authenticated device's identifier, the event is **rejected**.
2.  **Auto-Filling:** If the payload omits the `deviceId` but the request was authenticated via `X-Device-Key`, the backend automatically fills in the identity of the authenticated device.
3.  **Presence Updating:** Successful validation of an event batch from an authenticated device updates that device's `last_seen_at` timestamp in the database.

## Registry Exposure

The device registry APIs do not expose the `api_key_hash`. Instead, they expose an `authStatus` enum:
-   `unconfigured`: The device has no API key.
-   `active`: The device has an API key.

This allows the dashboard to visually indicate which devices are ready to be deployed.
