# Fleet Registry API

## Overview

The Fleet Registry provides a database-backed registry for the following entities:

- **Routes** — the defined bus routes in the network
- **Buses** — physical bus vehicles assigned to routes
- **Devices** — IoT/sensing devices installed on buses

The registry establishes the chain:

```
Device → Bus → Route
```

This allows the backend to correlate sensor events from a known device to its host bus and operational route.

As of **Step 16**, this linkage is live: when `deviceId` is provided in an incoming event, the backend resolves the full chain and stores the identity on both the `Event` and the `Incident`.

---

## Event Integration (Step 16)

### How It Works

```
POST /api/events  { "deviceId": "ANDROID-BUS-101", ... }
         ↓
  resolve_device_identity(db, "ANDROID-BUS-101")
         ↓
  Device (ANDROID-BUS-101)  →  Bus (id=...)  →  Route (id=...)
         ↓
  Event { device_id, bus_id, route_id }
         ↓
  Incident { device_id, bus_id, route_id }   ← copied from Event
         ↓
  Alert rules, WebSocket broadcast
```

### `deviceId` Is Optional

```json
{
  "eventId": "EVT_OLD",
  "eventType": "POTHOLE",
  "confidence": 0.91,
  "timestamp": "2026-09-04T13:05:22Z"
}
```

Events without `deviceId` continue to work exactly as before.  
`device_id`, `bus_id`, `route_id` will be `null` on the resulting Event and Incident.

### Resolution Rules

| Case | Condition | Result |
|------|-----------|--------|
| A | Active device → active bus → active route | Full resolution |
| B | Active device, no bus assigned | `deviceId` set; `busId`/`routeId` = null |
| C | Active device → active bus, no route | `deviceId` + `busId` set; `routeId` = null |
| D | Unknown `deviceId` | **HTTP 422 error** — register device first |
| E | Inactive device | **HTTP 422 error** |
| F | Device → inactive bus | **HTTP 422 error** |
| G | Bus → inactive route | **HTTP 422 error** |

> No automatic device provisioning. Devices must be registered via `POST /api/registry/devices` before submitting events with `deviceId`.

### Incident & API Response

All incident responses now include nullable fleet identity fields:

```json
{
  "id": "...",
  "eventId": "EVT_001",
  "deviceId": "ANDROID-BUS-101",
  "busId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "routeId": "7bc9f321-...",
  "incidentType": "pothole",
  "severity": "high",
  "status": "open"
}
```

### Fleet Filters on `GET /api/incidents`

```
GET /api/incidents?deviceId=ANDROID-BUS-101
GET /api/incidents?busId=<uuid>
GET /api/incidents?routeId=<uuid>
```

Fleet filters combine with existing `incidentType`, `severity`, `status`, `from`, `to` filters.

### Fleet Filters on `GET /api/map/incidents`

```
GET /api/map/incidents?minLatitude=...&maxLatitude=...&minLongitude=...&maxLongitude=...&deviceId=ANDROID-BUS-101
```

Map responses also include `deviceId`, `busId`, `routeId` per incident.

### Analytics

Fleet-filtered analytics are a future enhancement. Current analytics aggregate all incidents regardless of fleet identity.


---

## Base URL

```
/api/registry
```

---

## Authentication & Authorization

All endpoints require a valid JWT Bearer token.

| Action | Required Role |
|--------|--------------|
| Read (GET) | `admin`, `traffic_authority`, `municipal_authority` |
| Create (POST) | `admin` only |
| Update (PATCH) | `admin` only |

Non-admin roles receive `403 Forbidden` on write operations.

---

## Routes

### `GET /api/registry/routes`
Returns all routes.

**Response** `200 OK`:
```json
[
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
]
```

---

### `GET /api/registry/routes/{route_id}`
Returns a single route.

**Response** `200 OK` / `404 Not Found`

---

### `POST /api/registry/routes`
Creates a new route. `routeNumber` must be unique.

**Request body**:
```json
{
  "routeNumber": "101",
  "name": "Downtown Express",
  "origin": "North Station",
  "destination": "South Station",
  "isActive": true
}
```

**Errors**:
- `409 Conflict` — route number already exists
- `403 Forbidden` — non-admin role

---

### `PATCH /api/registry/routes/{route_id}`
Updates an existing route. All fields are optional.

**Request body** (partial update):
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

**Errors**:
- `404 Not Found` — route not found
- `409 Conflict` — updated routeNumber already taken
- `403 Forbidden` — non-admin role

---

## Buses

### `GET /api/registry/buses`
Returns all buses.

### `GET /api/registry/buses/{bus_id}`
Returns a single bus.

### `POST /api/registry/buses`
Creates a new bus. `busNumber` and `registrationNumber` must each be unique. `routeId` is optional.

**Request body**:
```json
{
  "busNumber": "B100",
  "registrationNumber": "KA-01-1234",
  "operator": "City Transit",
  "routeId": "<optional-route-uuid>",
  "isActive": true
}
```

**Errors**:
- `409 Conflict` — duplicate busNumber or registrationNumber
- `404 Not Found` — routeId references a non-existent route
- `403 Forbidden` — non-admin role

### `PATCH /api/registry/buses/{bus_id}`
Updates an existing bus. All fields are optional.

---

## Devices

### `GET /api/registry/devices`
Returns all devices.

### `GET /api/registry/devices/{device_id}`
Returns a single device.

### `POST /api/registry/devices`
Creates a new device. `deviceIdentifier` must be unique. `busId` is optional.

**Request body**:
```json
{
  "deviceIdentifier": "DEV-001",
  "name": "Front Camera",
  "deviceType": "camera",
  "busId": "<optional-bus-uuid>",
  "isActive": true
}
```

**Errors**:
- `409 Conflict` — duplicate deviceIdentifier
- `404 Not Found` — busId references a non-existent bus
- `403 Forbidden` — non-admin role

### `PATCH /api/registry/devices/{device_id}`
Updates an existing device. All fields are optional.

---

## Field Reference

### Route Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Auto-generated |
| `routeNumber` | string | Unique |
| `name` | string | Human-readable name |
| `origin` | string | Start location |
| `destination` | string | End location |
| `isActive` | bool | Soft deactivation |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Bus Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Auto-generated |
| `busNumber` | string | Unique |
| `registrationNumber` | string | Unique |
| `operator` | string | Operating company |
| `routeId` | string (UUID)? | FK to Route (nullable) |
| `isActive` | bool | Soft deactivation |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Device Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Auto-generated |
| `deviceIdentifier` | string | Unique, maps to Android device ID |
| `name` | string | Descriptive label |
| `deviceType` | string | e.g. `camera`, `gps`, `accelerometer` |
| `busId` | string (UUID)? | FK to Bus (nullable) |
| `isActive` | bool | Soft deactivation |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
