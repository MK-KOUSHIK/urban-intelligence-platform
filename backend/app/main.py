from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import events, incidents, alerts, websockets, auth, analytics, map, dashboard, registry, recordings
from app.database.core import Base, engine
from app.database.deps import get_db
import app.models.events
import app.models.incidents
import app.models.alerts
import app.models.users
import app.models.registry
import app.models.recordings
from app.auth.security import get_password_hash
from app.config import CORS_ORIGINS

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Urban Intelligence Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Setup demo users
    db = next(get_db())
    demo_users = [
        {"username": "admin", "password": "adminpassword", "role": "admin"},
        {"username": "traffic", "password": "trafficpassword", "role": "traffic_authority"},
        {"username": "municipal", "password": "municipalpassword", "role": "municipal_authority"}
    ]
    for user_data in demo_users:
        user = db.query(app.models.users.User).filter(app.models.users.User.username == user_data["username"]).first()
        if not user:
            new_user = app.models.users.User(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"]
            )
            db.add(new_user)
    db.commit()

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(map.router, prefix="/api/map", tags=["Map"])
app.include_router(events.router)
app.include_router(incidents.router)
app.include_router(alerts.router)
app.include_router(websockets.router)
app.include_router(registry.router)
app.include_router(recordings.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
