# Urban Intelligence Platform — Frontend Client

A production-grade React 18, Vite, TypeScript, and Tailwind CSS single-page web application for the Urban Intelligence Platform.

## Features

- **Authentication & Persistent Sessions:** Real FastAPI backend JWT authentication via `/api/auth/login` and `/api/auth/me`. Stores access token securely in `localStorage` under `urban_intelligence_token`.
- **Role-Aware Access Control & Navigation:** Typed user roles (`admin`, `traffic_authority`, `municipal_authority`) with UI protection (`RoleGuard`), role-aware sidebar navigation, and formatted role badges (`Administrator`, `Traffic Authority`, `Municipal Authority`).
- **Protected Routing:** Centralized `ProtectedRoute` guard ensuring unauthenticated users are directed to `/login`, while authenticated users visiting `/login` are automatically routed to `/dashboard`.
- **Command Center Design System:** High-density dark mode operational interface built for traffic authority monitoring centers.
- **Centralized Error & Interceptor Handling:** Axios HTTP client with automatic `Authorization: Bearer <token>` header injection, 401 unauthorized session invalidation, and mapped status code messages.

## Environment Variables

Configure `.env` or set environment variables before running:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

## Available Scripts

- `npm run dev`: Start local Vite development server
- `npm run build`: Compile TypeScript and build production bundle
- `npm run preview`: Preview local production build
- `npm test`: Run Vitest unit & integration test suite

## User Roles & Authorization

1. **`admin` (Administrator):** Access to all operational pages, live maps, telemetry, and administrative controls (device credentials, user management).
2. **`traffic_authority` (Traffic Authority):** Access to dashboard, live map, incidents, alerts, analytics, fleet, and recordings.
3. **`municipal_authority` (Municipal Authority):** Access to dashboard, live map, incidents, alerts, analytics, fleet, and recordings.

## Authentication Flow

1. User submits credentials at `/login`.
2. App dispatches `POST /api/auth/login` to FastAPI backend.
3. On success, JWT token is stored under key `urban_intelligence_token`, and user profile is stored in `AuthContext`.
4. On application refresh, `restoreSession()` issues `GET /api/auth/me` to validate the active session. If valid, the user state is restored; if 401, session storage is cleared and user is redirected to `/login`.
5. On logout, JWT and user state are cleared from `localStorage` and `AuthContext`, returning the operator to `/login`.
