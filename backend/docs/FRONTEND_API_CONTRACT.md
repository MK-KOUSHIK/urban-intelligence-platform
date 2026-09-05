# Frontend API Contract & Integration Guide

This document is the definitive single source of truth for Member 1 developing the React/Vite + Leaflet frontend for the **Urban Intelligence Platform**.

---

## 1. Environment & Base URL Configuration

### Frontend Environment Variables (`.env`)
Create a `.env` file in the root of the React project:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/events
```

### Backend CORS Configuration
The backend accepts requests from origins configured in `CORS_ORIGINS` (default: `http://localhost:5173,http://localhost:3000`).

---

## 2. Authentication & User Roles

The backend uses JWT Bearer tokens for human dashboard users.

- **Header:** `Authorization: Bearer <accessToken>`
- **Token Expiry:** 24 hours (1440 minutes)

### User Roles
- `admin`: Full read and write access across all resources (incidents, alerts, recordings, fleet registry, device API key generation).
- `traffic_authority`: Full read access across all resources; permission to update incident/alert statuses.
- `municipal_authority`: Full read access across all resources; permission to update incident/alert statuses.

---

### POST `/api/auth/login`
Authenticate a dashboard user and receive a JWT access token.

- **Auth Required:** No
- **Request Body:**
```json
{
  "username": "admin",
  "password": "adminpassword"
}
```
*Demo Credentials:*
- `admin` / `adminpassword` (`admin`)
- `traffic` / `trafficpassword` (`traffic_authority`)
- `municipal` / `municipalpassword` (`municipal_authority`)

- **Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "tokenType": "bearer",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "admin",
    "role": "admin"
  }
}
```
- **Error Response (401 Unauthorized):**
```json
{
  "detail": "Incorrect username or password"
}
```

---

### GET `/api/auth/me`
Retrieve the authenticated user's profile using their JWT token.

- **Auth Required:** Yes (Any valid JWT)
- **Success Response (200 OK):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "username": "admin",
  "role": "admin"
}
```
- **Error Response (401 Unauthorized):**
```json
{
  "detail": "Could not validate credentials"
}
```

---

## 3. System Status & Health

### GET `/health`
Simple health check endpoint.

- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "status": "ok"
}
```

### GET `/api/status`
Backend service operational check.

- **Auth Required:** Yes (Any role)
- **Response (200 OK):**
```json
{
  "status": "ok",
  "service": "urban-intelligence-backend",
  "version": "1.0.0"
}
```

---

## 4. Dashboard Overview

### GET `/api/dashboard/overview`
Aggregates summary statistics, recent incidents (top 10), and recent alerts (top 10) for initial dashboard render.

- **Auth Required:** Yes (Any role)
- **Response (200 OK):**
```json
{
  "summary": {
    "totalIncidents": 150,
    "openIncidents": 50,
    "acknowledgedIncidents": 30,
    "resolvedIncidents": 70,
    "highSeverityIncidents": 40,
    "mediumSeverityIncidents": 60,
    "lowSeverityIncidents": 50,
    "totalAlerts": 25,
    "unreadAlerts": 10,
    "acknowledgedAlerts": 5,
    "resolvedAlerts": 10
  },
  "recentIncidents": [
    {
      "id": "INC_101",
      "eventId": "EVT_101",
      "incidentType": "POTHOLE",
      "severity": "high",
      "confidence": 0.95,
      "timestamp": "2026-09-04T12:00:00Z",
      "location": {
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracyMeters": 5.0
      },
      "recordingId": "REC_001",
      "status": "open",
      "description": null,
      "deviceId": "DEV_001",
      "busId": "BUS_101",
      "routeId": "ROUTE_1"
    }
  ],
  "recentAlerts": [
    {
      "id": "ALT_101",
      "incidentId": "INC_101",
      "alertType": "high_severity",
      "severity": "high",
      "message": "High severity POTHOLE detected.",
      "status": "unread",
      "createdAt": "2026-09-04T12:00:01Z"
    }
  ]
}
```

---

## 5. Incidents

### GET `/api/incidents`
Retrieve a paginated list of incidents with optional filters.

- **Auth Required:** Yes (Any role)
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `pageSize` (integer, default: 20, max: 100)
  - `incidentType` (optional string, e.g. `POTHOLE`, `ROAD_DAMAGE`, `WATERLOGGING`)
  - `severity` (optional string: `high`, `medium`, `low`)
  - `status` (optional string: `open`, `acknowledged`, `resolved`)
  - `from` (optional ISO datetime)
  - `to` (optional ISO datetime)
  - `deviceId` (optional string)
  - `busId` (optional string UUID)
  - `routeId` (optional string UUID)

- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "INC_101",
      "eventId": "EVT_101",
      "incidentType": "POTHOLE",
      "severity": "high",
      "confidence": 0.95,
      "timestamp": "2026-09-04T12:00:00Z",
      "location": {
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracyMeters": 5.0
      },
      "recordingId": "REC_001",
      "status": "open",
      "description": null,
      "deviceId": "DEV_001",
      "busId": "BUS_101",
      "routeId": "ROUTE_1"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### GET `/api/incidents/{id}`
Retrieve details for a specific incident by ID.

- **Auth Required:** Yes (Any role)
- **Response (200 OK):** `IncidentResponse` object.
- **Error (404 Not Found):** `{"detail": "Incident not found"}`

---

### PATCH `/api/incidents/{id}`
Update an incident's status and/or description.

- **Auth Required:** Yes (Any role)
- **Status Workflow Transitions:**
  - `open` → `acknowledged` or `resolved`
  - `acknowledged` → `resolved`
  - Invalid transitions return `409 Conflict`.
- **Request Body:**
```json
{
  "status": "acknowledged",
  "description": "Inspection team dispatched to site."
}
```
- **Response (200 OK):** Updated `IncidentResponse` object.
- **Error (409 Conflict):** `{"detail": "Invalid incident status transition"}`

---

### GET `/api/incidents/{id}/evidence`
Retrieve evidence (recording metadata) linked to an incident.

- **Auth Required:** Yes (Any role)
- **Response (200 OK):**
```json
{
  "incidentId": "INC_101",
  "recordingId": "REC_001",
  "hasRecording": true,
  "recordingMetadata": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "recordingId": "REC_001",
    "status": "available",
    "startTime": "2026-09-04T12:00:00Z",
    "endTime": "2026-09-04T12:02:00Z",
    "durationSeconds": 120,
    "fileSizeBytes": 10485760,
    "filePath": "/storage/recordings/REC_001.mp4",
    "deviceId": "DEV_001",
    "busId": "BUS_101",
    "routeId": "ROUTE_1"
  }
}
```
*Note:* If `hasRecording` is `false`, `recordingMetadata` is `null`. Note also that `filePath` (or video URL) may be `null` if not uploaded.

---

## 6. Alerts

### GET `/api/alerts`
Retrieve a paginated list of system alerts.

- **Auth Required:** Yes (Any role)
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `pageSize` (integer, default: 20, max: 100)
  - `status` (optional string: `unread`, `acknowledged`, `resolved`)
  - `severity` (optional string: `high`, `medium`, `low`)
  - `alertType` (optional string: `high_severity`, `road_damage`, `waterlogging`, etc.)

- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "ALT_101",
      "incidentId": "INC_101",
      "alertType": "high_severity",
      "severity": "high",
      "message": "High severity POTHOLE detected.",
      "status": "unread",
      "createdAt": "2026-09-04T12:00:01Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### PATCH `/api/alerts/{id}`
Update an alert's status.

- **Auth Required:** Yes (Any role)
- **Status Workflow Transitions:**
  - `unread` → `acknowledged` or `resolved`
  - `acknowledged` → `resolved`
- **Request Body:**
```json
{
  "status": "acknowledged"
}
```
- **Response (200 OK):** Updated `AlertResponse` object.
- **Error (409 Conflict):** `{"detail": "Invalid alert status transition"}`

---

## 7. Analytics

### GET `/api/analytics/summary`
Get aggregated count statistics.

- **Auth Required:** Yes (Any role)
- **Query Parameters:** `from` (optional datetime), `to` (optional datetime)
- **Response (200 OK):**
```json
{
  "totalIncidents": 150,
  "openIncidents": 50,
  "acknowledgedIncidents": 30,
  "resolvedIncidents": 70,
  "highSeverityIncidents": 40,
  "mediumSeverityIncidents": 60,
  "lowSeverityIncidents": 50,
  "totalAlerts": 25,
  "unreadAlerts": 10,
  "acknowledgedAlerts": 5,
  "resolvedAlerts": 10
}
```

---

### GET `/api/analytics/incidents-by-type`
Get incident counts grouped by type (sorted descending by count).

- **Auth Required:** Yes (Any role)
- **Query Parameters:** `from` (optional), `to` (optional)
- **Response (200 OK):**
```json
{
  "items": [
    { "incidentType": "POTHOLE", "count": 90 },
    { "incidentType": "ROAD_DAMAGE", "count": 40 },
    { "incidentType": "WATERLOGGING", "count": 20 }
  ]
}
```

---

### GET `/api/analytics/incidents-by-severity`
Get incident counts grouped by severity.

- **Auth Required:** Yes (Any role)
- **Query Parameters:** `from` (optional), `to` (optional)
- **Response (200 OK):**
```json
{
  "items": [
    { "severity": "high", "count": 40 },
    { "severity": "medium", "count": 60 },
    { "severity": "low", "count": 50 }
  ]
}
```

---

### GET `/api/analytics/alerts-by-status`
Get alert counts grouped by status.

- **Auth Required:** Yes (Any role)
- **Query Parameters:** `from` (optional), `to` (optional)
- **Response (200 OK):**
```json
{
  "items": [
    { "status": "unread", "count": 10 },
    { "status": "acknowledged", "count": 5 },
    { "status": "resolved", "count": 10 }
  ]
}
```

---

## 8. Map APIs (Leaflet Ready)

### GET `/api/map/incidents`
Fetch incidents located within a geographic bounding box for rendering map markers.

- **Auth Required:** Yes (Any role)
- **Query Parameters (Required Bounding Box):**
  - `minLatitude` (float: -90 to 90)
  - `maxLatitude` (float: -90 to 90)
  - `minLongitude` (float: -180 to 180)
  - `maxLongitude` (float: -180 to 180)
- **Optional Filters:**
  - `incidentType`, `severity`, `status`, `from`, `to`, `deviceId`, `busId`, `routeId`, `limit` (default: 1000, max: 2000)

- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "INC_101",
      "incidentType": "POTHOLE",
      "severity": "high",
      "confidence": 0.95,
      "timestamp": "2026-09-04T12:00:00Z",
      "location": {
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracyMeters": 5.0
      },
      "status": "open",
      "deviceId": "DEV_001",
      "busId": "BUS_101",
      "routeId": "ROUTE_1"
    }
  ],
  "total": 1
}
```

---

### GET `/api/map/heatmap`
Fetch weighted point coordinates within a bounding box for rendering Leaflet heatmap overlays.

- **Auth Required:** Yes (Any role)
- **Query Parameters:** `minLatitude`, `maxLatitude`, `minLongitude`, `maxLongitude`, `incidentType`, `severity`, `status`, `from`, `to`, `limit` (default: 5000)
- **Response (200 OK):**
```json
{
  "items": [
    {
      "latitude": 17.385044,
      "longitude": 78.486671,
      "weight": 1
    }
  ]
}
```

---

## 9. Fleet Registry

**Read Permissions:** `admin`, `traffic_authority`, `municipal_authority`  
**Write Permissions:** `admin` only

### Routes Endpoints
- `GET /api/registry/routes`
- `GET /api/registry/routes/{id}`
- `POST /api/registry/routes`
- `PATCH /api/registry/routes/{id}`

**Route Schema Example:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "routeNumber": "101",
  "name": "Secunderabad - Gachibowli",
  "origin": "Secunderabad Station",
  "destination": "Gachibowli DLF",
  "isActive": true,
  "createdAt": "2026-09-04T10:00:00Z",
  "updatedAt": "2026-09-04T10:00:00Z"
}
```

---

### Buses Endpoints
- `GET /api/registry/buses`
- `GET /api/registry/buses/{id}`
- `POST /api/registry/buses`
- `PATCH /api/registry/buses/{id}`

**Bus Schema Example:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "busNumber": "TS-09-UA-1001",
  "registrationNumber": "TS09UA1001",
  "operator": "TSRTC",
  "routeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "isActive": true,
  "createdAt": "2026-09-04T10:00:00Z",
  "updatedAt": "2026-09-04T10:00:00Z"
}
```

---

### Devices & Credentials Endpoints
- `GET /api/registry/devices`
- `GET /api/registry/devices/{id}`
- `POST /api/registry/devices`
- `PATCH /api/registry/devices/{id}`
- `POST /api/registry/devices/{id}/credentials` (Admin only — generates API key)

**Device Schema Example:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "deviceIdentifier": "DEV_001",
  "name": "Front Dashboard Camera 1",
  "deviceType": "camera",
  "busId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "isActive": true,
  "createdAt": "2026-09-04T10:00:00Z",
  "updatedAt": "2026-09-04T10:00:00Z",
  "hasCredentials": true,
  "lastSeenAt": "2026-09-04T12:00:00Z"
}
```

**Credentials Response:**
```json
{
  "deviceId": "DEV_001",
  "apiKey": "uip_dev_a1b2c3d4e5..."
}
```

---

## 10. Recordings

- `GET /api/recordings` (Params: `page`, `pageSize`, `deviceId`, `busId`, `status`)
- `GET /api/recordings/{id}`
- `GET /api/recordings/{id}/incidents` (Params: `page`, `pageSize`)
- `POST /api/recordings` (Requires Admin JWT or `X-Device-Key`)
- `PATCH /api/recordings/{id}` (Admin only)

**Recording Schema Example:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recordingId": "REC_001",
  "deviceId": "DEV_001",
  "busId": "BUS_101",
  "routeId": "ROUTE_1",
  "startTime": "2026-09-04T12:00:00Z",
  "endTime": "2026-09-04T12:02:00Z",
  "durationSeconds": 120,
  "fileSizeBytes": 10485760,
  "filePath": "/storage/recordings/REC_001.mp4",
  "status": "available",
  "createdAt": "2026-09-04T12:02:05Z",
  "updatedAt": "2026-09-04T12:02:05Z"
}
```

---

## 11. Real-Time WebSockets (`/ws/events`)

The frontend loads initial historical data via REST, then establishes a single WebSocket connection for real-time state updates.

- **WebSocket URL:** `ws://localhost:8000/ws/events`

### Message Payload Protocol
Every message pushed by the backend arrives as a JSON string with the following wrapper structure:

```json
{
  "type": "<event_type>",
  "data": { ... }
}
```

### Event Types & Data Schemas

#### 1. `incident.created` & `incident.updated`
Data payload is a full camelCase `IncidentResponse` object.
```json
{
  "type": "incident.created",
  "data": {
    "id": "INC_101",
    "eventId": "EVT_101",
    "incidentType": "POTHOLE",
    "severity": "high",
    "confidence": 0.95,
    "timestamp": "2026-09-04T12:00:00Z",
    "location": {
      "latitude": 17.385044,
      "longitude": 78.486671,
      "accuracyMeters": 5.0
    },
    "recordingId": "REC_001",
    "status": "open",
    "description": null,
    "deviceId": "DEV_001",
    "busId": "BUS_101",
    "routeId": "ROUTE_1"
  }
}
```

#### 2. `alert.created` & `alert.updated`
Data payload is a full camelCase `AlertResponse` object.
```json
{
  "type": "alert.created",
  "data": {
    "id": "ALT_101",
    "incidentId": "INC_101",
    "alertType": "high_severity",
    "severity": "high",
    "message": "High severity POTHOLE detected.",
    "status": "unread",
    "createdAt": "2026-09-04T12:00:01Z"
  }
}
```

#### 3. `recording.created` & `recording.updated`
Data payload is a full camelCase `RecordingResponse` object.
```json
{
  "type": "recording.created",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "recordingId": "REC_001",
    "deviceId": "DEV_001",
    "busId": "BUS_101",
    "routeId": "ROUTE_1",
    "status": "uploading"
  }
}
```

---

## 12. Error Response Contract

The backend uses standard HTTP status codes and FastAPI's error format:

```json
{
  "detail": "Description of the error"
}
```

| HTTP Code | Error Condition |
|-----------|-----------------|
| `400 Bad Request` | Invalid parameters (e.g. `from` date after `to` date). |
| `401 Unauthorized` | Missing, invalid, or expired JWT token or `X-Device-Key`. |
| `403 Forbidden` | Authenticated user lacks required role (e.g. non-admin write). |
| `404 Not Found` | Requested resource ID does not exist. |
| `409 Conflict` | Business constraint violation (e.g. invalid status transition). |
| `422 Unprocessable Entity` | Schema validation error or out-of-range map bounding box. |
