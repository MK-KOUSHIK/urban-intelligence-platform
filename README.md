# Urban Intelligence Platform

Real-time urban operations command center and edge sensing platform. Correlates AI sensing events from transit dashcam smart cameras (buses/fleets) into centralized incident records, automated authority alerts, real-time spatial heatmaps, and evidence archives.

---

## Run Locally

### 1. Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18 or higher (with npm)
- **Virtual Environment**: Recommended (`venv` or `conda`)

---

### 2. Environment Variables

#### Backend (`backend/.env`)
Create `backend/.env` (optional for local SQLite development; defaults apply automatically):
```env
DATABASE_URL=sqlite+aiosqlite:///./urban_intel.db
JWT_SECRET_KEY=dev-insecure-secret-key-replace-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```
*(For PostgreSQL: set `DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/urban_intel`)*

#### Frontend (`frontend/.env`)
Create `frontend/.env` based on `frontend/.env.example`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/events
```

---

### 3. Backend Setup & Start

```bash
cd backend

# Create and activate virtual environment (if not already active)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The FastAPI API documentation is accessible at `http://localhost:8000/docs`.

---

### 4. Frontend Setup & Start

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### 5. Demo Operator Accounts & Roles

The system seeds three preconfigured operators for testing role-based access control (RBAC):

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin` | `adminpassword` | Full read/write, fleet registry mutations, device credential generation, alert acknowledge/resolve |
| **Traffic Authority** | `traffic` | `trafficpassword` | Read-only fleet/alerts, incident lifecycle progression (open &rarr; acknowledged &rarr; resolved) |
| **Municipal Authority** | `municipal` | `municipalpassword` | Read-only fleet/alerts, municipal incident lifecycle progression |

---

### 6. Application Routes

| Route | View | Description |
|---|---|---|
| `/login` | Authentication | Operator sign-in with JWT token exchange |
| `/dashboard` | Command Center | Live incident metrics, critical alerts feed, quick actions, distribution |
| `/map` | Spatial Operations | Interactive Leaflet map with severity markers, incident popups, and density heatmap |
| `/incidents` | Incident Ledger | Server-side paginated incident table with multi-parameter filtering |
| `/incidents/:id` | Incident Detail | Full incident telemetry, GPS map, evidence linking, and status transitions |
| `/alerts` | Alert Center | Real-time automated alert log with acknowledge and resolve workflows |
| `/analytics` | Analytics & Insights | Sensed network KPIs, incident breakdown charts, and date-range filters |
| `/fleet` | Fleet Registry | Route &rarr; Bus &rarr; Device hierarchy and secure one-time API key provisioning |
| `/recordings` | Recording Archive | Sensing video and telemetry metadata archive |
| `/recordings/:id` | Recording Detail | Associated incident list, evidence map, and video playback player |
| `/settings` | System Settings | Theme toggle (Dark/Light), active operator session, and connection diagnostics |

---

### 7. Real-Time WebSocket Architecture

- **Endpoint**: `ws://localhost:8000/ws/events`
- **Lifecycle**: Exactly **one** shared WebSocket connection is established when an operator signs in and automatically severed upon logout.
- **Resilience**: Reconnects automatically with exponential backoff on network disconnects.
- **Zero Polling**: No background `setInterval` polling for alerts or notifications.
- **Broadcast Events Handled**:
  - `incident.created` & `incident.updated`: Live updates to Dashboard, Map, Incidents, and detail views.
  - `alert.created` & `alert.updated`: Live updates to TopBar notification bell, Alert Center, and Dashboard.
  - `recording.created` & `recording.updated`: Live updates to Recordings archive.

---

### 8. Edge / Android Smart Camera Integration

```
+--------------------------+
|   Android Smart Camera   |
|   (On-Device AI Model)   |
+--------------------------+
             |
             | 1. HTTP POST /api/events (X-Device-Key)
             | 2. HTTP POST /api/recordings (Metadata)
             v
+--------------------------+
|      FastAPI Backend     |
|   (Correlator & DB)      |
+--------------------------+
             |
             | WebSocket broadcast (/ws/events)
             v
+--------------------------+
|  React/Vite Dashboard    |
|  (Command Center UI)     |
+--------------------------+
```

1. **Edge AI Inference**: All computer vision inference (detecting potholes, pedestrians, road hazards) occurs directly on the edge camera (Android / embedded device). The laptop and browser do not perform video inference.
2. **Event Ingestion**: Devices authenticate using secure API keys generated by an Administrator (`POST /api/registry/devices/{id}/credentials`).
3. **Backend Correlation**: The backend matches the device to its Bus and Route in the Fleet Registry, derives incident severity, generates automated alerts, and broadcasts updates via WebSocket.

---

### 9. Known Limitations

- **Dashcam Video Streaming**: Dashcam files stored on remote devices (`filePath`) require an external streaming server or direct HTTP/S3 URL for browser playback. When an unstreamable filesystem path is present, the interface displays *"Video unavailable for streaming."* while preserving full metadata verification.
- **Physical Camera Hardware**: Physical Android camera hardware must share network connectivity with the backend server host to deliver live road telemetry.
- **Spatial Indexing Scale**: Development runs on SQLite for ease of setup; production at metropolitan scale requires PostgreSQL with PostGIS for bounding box queries.