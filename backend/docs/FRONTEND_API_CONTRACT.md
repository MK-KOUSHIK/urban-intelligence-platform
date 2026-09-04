# Frontend API Contract

This document describes the REST and WebSocket APIs provided by the Urban Intelligence Platform backend for the React/Vite + Leaflet frontend.

## Base URL
All API requests should be prefixed with `/api` unless otherwise specified.
Example: `http://localhost:8000/api`

## Authentication

The backend uses JWT Bearer tokens for authentication.

**Header:**
`Authorization: Bearer <accessToken>`

**Errors:**
- `401 Unauthorized`: No token provided, invalid token, or expired token.
- `403 Forbidden`: Authenticated, but lacking the necessary role.

### Login
- **Method:** POST
- **Path:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
```json
{
  "username": "admin",
  "password": "adminpassword"
}
```
*Note: Demo credentials are for development only.*
- **Response:**
```json
{
  "access_token": "eyJhb...",
  "token_type": "bearer",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Status & Health

### Health Check
- **Method:** GET
- **Path:** `/health`
- **Auth Required:** No
- **Response:**
```json
{
  "status": "ok"
}
```

### Backend Status
- **Method:** GET
- **Path:** `/api/status`
- **Auth Required:** Yes
- **Response:**
```json
{
  "status": "ok",
  "service": "urban-intelligence-backend",
  "version": "1.0.0"
}
```

---

## Dashboard Overview

### Get Overview
- **Method:** GET
- **Path:** `/api/dashboard/overview`
- **Auth Required:** Yes
- **Response:**
Aggregates summary stats, recent incidents (up to 10), and recent alerts (up to 10).
```json
{
  "summary": {
    "totalIncidents": 150,
    "resolvedIncidents": 100,
    "openIncidents": 50,
    "totalAlerts": 10,
    "activeAlerts": 5
  },
  "recentIncidents": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "incidentType": "pothole",
      "severity": "high",
      "confidence": 0.95,
      "timestamp": "2026-09-04T12:00:00Z",
      "location": {
        "latitude": 34.05,
        "longitude": -118.25,
        "accuracyMeters": 10
      },
      "recordingId": "uuid",
      "status": "open",
      "description": "Deep pothole reported"
    }
  ],
  "recentAlerts": [
    {
      "id": "uuid",
      "incidentId": "uuid",
      "alertType": "severe_hazard",
      "severity": "high",
      "message": "High severity pothole detected.",
      "isRead": false,
      "timestamp": "2026-09-04T12:00:00Z"
    }
  ]
}
```

---

## Incidents

### List Incidents
- **Method:** GET
- **Path:** `/api/incidents`
- **Auth Required:** Yes
- **Query Parameters:**
  - `incidentType` (optional)
  - `severity` (optional)
  - `status` (optional)
  - `from` (optional datetime)
  - `to` (optional datetime)
  - `limit` (default: 100, max: 1000)
  - `skip` (default: 0)
- **Response:**
```json
{
  "items": [ /* array of Incident objects */ ],
  "total": 50,
  "page": 1,
  "pageSize": 100
}
```

### Get Incident by ID
- **Method:** GET
- **Path:** `/api/incidents/{id}`
- **Auth Required:** Yes
- **Response:**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "incidentType": "pothole",
  "severity": "high",
  "confidence": 0.95,
  "timestamp": "2026-09-04T12:00:00Z",
  "location": {
    "latitude": 34.05,
    "longitude": -118.25,
    "accuracyMeters": 10
  },
  "recordingId": "uuid",
  "status": "open",
  "description": "Deep pothole reported"
}
```

### Update Incident Status
- **Method:** PATCH
- **Path:** `/api/incidents/{id}`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "status": "acknowledged",
  "description": "Repair crew dispatched"
}
```
- **Response:** Updated Incident object.

---

## Alerts

### List Alerts
- **Method:** GET
- **Path:** `/api/alerts`
- **Auth Required:** Yes
- **Query Parameters:**
  - `isRead` (optional boolean)
  - `severity` (optional string)
  - `limit` (default: 100)
  - `skip` (default: 0)
- **Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "incidentId": "uuid",
      "alertType": "severe_hazard",
      "severity": "high",
      "message": "High severity pothole detected.",
      "isRead": false,
      "timestamp": "2026-09-04T12:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 100
}
```

### Update Alert (Mark as Read)
- **Method:** PATCH
- **Path:** `/api/alerts/{id}`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "isRead": true
}
```
- **Response:** Updated Alert object.

---

## Analytics

### Get Summary
- **Method:** GET
- **Path:** `/api/analytics/summary`
- **Auth Required:** Yes
- **Response:**
```json
{
  "totalIncidents": 150,
  "resolvedIncidents": 100,
  "openIncidents": 50,
  "totalAlerts": 10,
  "activeAlerts": 5
}
```

### Incidents by Type
- **Method:** GET
- **Path:** `/api/analytics/incidents-by-type`
- **Auth Required:** Yes
- **Response:**
```json
{
  "pothole": 120,
  "traffic_light_out": 30
}
```

### Incidents by Severity
- **Method:** GET
- **Path:** `/api/analytics/incidents-by-severity`
- **Auth Required:** Yes
- **Response:**
```json
{
  "high": 40,
  "medium": 80,
  "low": 30
}
```

### Alerts by Status
- **Method:** GET
- **Path:** `/api/analytics/alerts-by-status`
- **Auth Required:** Yes
- **Response:**
```json
{
  "read": 8,
  "unread": 2
}
```

---

## Map

### Map Incidents
- **Method:** GET
- **Path:** `/api/map/incidents`
- **Auth Required:** Yes
- **Query Parameters:**
  - `minLat`, `maxLat`, `minLng`, `maxLng` (required)
- **Response:**
```json
[
  {
    "id": "uuid",
    "incidentType": "pothole",
    "severity": "high",
    "status": "open",
    "location": {
      "latitude": 34.05,
      "longitude": -118.25,
      "accuracyMeters": 10
    }
  }
]
```

### Heatmap
- **Method:** GET
- **Path:** `/api/map/heatmap`
- **Auth Required:** Yes
- **Query Parameters:**
  - `minLat`, `maxLat`, `minLng`, `maxLng` (required)
- **Response:**
```json
[
  {
    "latitude": 34.05,
    "longitude": -118.25,
    "weight": 3
  }
]
```

---

## Real-time (WebSockets)

REST handles initial and historical state. WebSockets handle live updates.
**Frontend Sequence:**
1. Login via `/api/auth/login`.
2. Store `accessToken`.
3. Load initial dashboard state via REST endpoints (e.g. `/api/dashboard/overview`).
4. Connect to WebSocket.
5. Apply live incoming messages to update the frontend state.

### Connect
- **Path:** `ws://<backend_url>/ws/events`

### Message Protocol
Messages sent from the backend are stringified JSON objects matching this shape:

```json
{
  "type": "<message_type>",
  "data": { ... }
}
```

### Message Types
- `incident.created`
- `incident.updated`
- `alert.created`
- `alert.updated`

**Example: Incident Created**
```json
{
  "type": "incident.created",
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "incidentType": "pothole",
    "severity": "high",
    "confidence": 0.95,
    "timestamp": "2026-09-04T12:00:00Z",
    "location": {
      "latitude": 34.05,
      "longitude": -118.25,
      "accuracyMeters": 10
    },
    "recordingId": "uuid",
    "status": "open",
    "description": null
  }
}
```

---

## Fleet Registry (Step 15)

**Base path:** `/api/registry`

**Read Access:** `admin`, `traffic_authority`, `municipal_authority`
**Write Access:** `admin` only

### Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/registry/routes` | List all routes |
| `GET` | `/api/registry/routes/{id}` | Get a single route |
| `POST` | `/api/registry/routes` | Create a route (admin) |
| `PATCH` | `/api/registry/routes/{id}` | Update a route (admin) |

**Route object:**
```json
{
  "id": "uuid",
  "routeNumber": "101",
  "name": "Downtown Express",
  "origin": "North Station",
  "destination": "South Station",
  "isActive": true,
  "createdAt": "2026-09-04T10:00:00Z",
  "updatedAt": "2026-09-04T10:00:00Z"
}
```

### Buses

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/registry/buses` | List all buses |
| `GET` | `/api/registry/buses/{id}` | Get a single bus |
| `POST` | `/api/registry/buses` | Create a bus (admin) |
| `PATCH` | `/api/registry/buses/{id}` | Update a bus (admin) |

**Bus object:**
```json
{
  "id": "uuid",
  "busNumber": "B100",
  "registrationNumber": "KA-01-1234",
  "operator": "City Transit",
  "routeId": "uuid or null",
  "isActive": true,
  "createdAt": "2026-09-04T10:00:00Z",
  "updatedAt": "2026-09-04T10:00:00Z"
}
```

### Devices

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/registry/devices` | List all devices |
| `GET` | `/api/registry/devices/{id}` | Get a single device |
| `POST` | `/api/registry/devices` | Create a device (admin) |
| `PATCH` | `/api/registry/devices/{id}` | Update a device (admin) |

**Device object:**
```json
{
  "id": "uuid",
  "deviceIdentifier": "DEV-001",
  "name": "Front Camera",
  "deviceType": "camera",
  "busId": "uuid or null",
  "isActive": true,
  "createdAt": "2026-09-04T10:00:00Z",
  "updatedAt": "2026-09-04T10:00:00Z"
}
```

**Common error codes for Registry:**
- `409 Conflict` — Duplicate unique field (routeNumber, busNumber, registrationNumber, deviceIdentifier)
- `404 Not Found` — Referenced FK (routeId / busId) does not exist
- `403 Forbidden` — Non-admin role attempting a write operation

---

## Step 16: Fleet Identity in Events and Incidents

### Optional deviceId in POST /api/events

The deviceId field is **optional** in the event payload.

`json
{
  "events": [
    {
      "eventId": "EVT_001",
      "eventType": "POTHOLE",
      "confidence": 0.91,
      "timestamp": "2026-09-04T13:05:22Z",
      "deviceId": "ANDROID-BUS-101",
      "location": { "latitude": 17.385, "longitude": 78.486, "accuracyMeters": 5.2 }
    }
  ]
}
`

- If deviceId is **omitted**: event is processed normally, identity fields = null.
- If deviceId is **present**: backend resolves Device ? Bus ? Route from the registry.
- Unknown or inactive deviceId returns an error entry in the batch response (not HTTP error).

### AcceptedEvent response now includes identity fields:

`json
{
  "eventId": "EVT_001",
  "status": "created",
  "incidentId": "...",
  "deviceId": "ANDROID-BUS-101",
  "busId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "routeId": "7bc9f321-..."
}
`

### IncidentResponse now includes nullable identity fields:

`json
{
  "id": "...",
  "eventId": "EVT_001",
  "incidentType": "pothole",
  "severity": "high",
  "confidence": 0.91,
  "timestamp": "2026-09-04T13:05:22Z",
  "location": { "latitude": 17.385, "longitude": 78.486, "accuracyMeters": 5.2 },
  "recordingId": "REC_001",
  "status": "open",
  "deviceId": "ANDROID-BUS-101",
  "busId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "routeId": "7bc9f321-..."
}
`

### Fleet Filters on GET /api/incidents

| Query Param | Description |
|-------------|-------------|
| deviceId  | Filter incidents by device identifier |
| usId     | Filter incidents by bus UUID |
| outeId   | Filter incidents by route UUID |

All fleet filters combine with existing incidentType, severity, status, rom, 	o filters.

### Fleet Filters on GET /api/map/incidents

Same deviceId, usId, outeId params available on the map endpoint.
Map incident objects also expose deviceId, usId, outeId (nullable).

### WebSocket (incident.created / incident.updated)

The incident.created and incident.updated WebSocket messages now include fleet identity in the data payload (all nullable), since the payload is serialized from IncidentResponse.

### Not yet implemented

- Device authentication (API keys / certificates)
- Auto-provisioning of devices
- Fleet-filtered analytics

---

## Step 17: Evidence & Recording Management

**Base path:** `/api/recordings`

**Read Access:** `admin`, `traffic_authority`, `municipal_authority`
**Write Access:** `admin` only

### Recordings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recordings` | List all recordings |
| `GET` | `/api/recordings/{id}` | Get a single recording |
| `POST` | `/api/recordings` | Create a recording metadata entry (admin) |
| `PATCH` | `/api/recordings/{id}` | Update recording metadata (admin) |
| `GET` | `/api/recordings/{id}/incidents` | List incidents linked to a specific recording |

**Recording object:**
```json
{
  "id": "uuid",
  "recordingId": "REC_001",
  "deviceId": "DEV-001",
  "busId": "uuid or null",
  "routeId": "uuid or null",
  "startTime": "2026-09-04T12:00:00Z",
  "endTime": "2026-09-04T12:02:00Z",
  "durationSeconds": 120,
  "fileSizeBytes": 10485760,
  "filePath": "/recordings/REC_001.mp4",
  "status": "available",
  "createdAt": "2026-09-04T12:02:05Z",
  "updatedAt": "2026-09-04T12:02:05Z"
}
```

### Incident Evidence

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/incidents/{incident_id}/evidence` | Get evidence metadata for a specific incident |

**Incident Evidence Response:**
```json
{
  "incidentId": "uuid",
  "recordingId": "REC_001",
  "hasRecording": true,
  "recordingMetadata": {
    "id": "uuid",
    "recordingId": "REC_001",
    "status": "available",
    "startTime": "2026-09-04T12:00:00Z",
    "endTime": "2026-09-04T12:02:00Z",
    "durationSeconds": 120,
    "fileSizeBytes": 10485760,
    "filePath": "/recordings/REC_001.mp4",
    "deviceId": "DEV-001",
    "busId": "uuid or null",
    "routeId": "uuid or null"
  }
}
```

### WebSocket (recording.created / recording.updated)

The `recording.created` and `recording.updated` WebSocket messages broadcast changes to recording metadata.

**Example:**
```json
{
  "type": "recording.updated",
  "data": {
    "id": "uuid",
    "recordingId": "REC_001",
    "status": "available",
    ...
  }
}
```

---

## Step 18: Device Authentication

**Dual-Auth System:**
- **Human Dashboard Users:** `Authorization: Bearer <JWT>`
- **Android Sensing Devices:** `X-Device-Key: <api_key>`

### Ingestion Endpoints (Dual-Auth)

The following ingestion endpoints accept either `Authorization: Bearer <JWT>` (for admin testing) or `X-Device-Key: <api_key>` (for production Android devices):

- `POST /api/events`
- `POST /api/recordings`

### Generating Credentials

- **Method:** POST
- **Path:** `/api/registry/devices/{id}/credentials`
- **Auth Required:** Yes (Admin JWT)
- **Response:**
```json
{
  "api_key": "uip_dev_...",
  "message": "Store this key securely. It will not be shown again."
}
```

### Auth Status on Registry

The `GET /api/registry/devices` and `GET /api/registry/devices/{id}` endpoints now include an `authStatus` field:
- `unconfigured`: No API key generated.
- `active`: API key generated.
- `revoked`: (Future functionality).
