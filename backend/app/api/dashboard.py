from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.deps import get_db
from app.auth.deps import require_roles
from app.models.users import User
from app.schemas.dashboard import BackendStatusResponse, DashboardOverviewResponse
from app.schemas.analytics import AnalyticsSummaryResponse
from app.services.analytics import get_summary_stats
from app.services.incidents import get_incidents
from app.services.alerts import get_alerts

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/status", response_model=BackendStatusResponse)
def get_backend_status(current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))):
    return BackendStatusResponse(
        status="ok",
        service="urban-intelligence-backend",
        version="1.0.0"
    )

@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    # Fetch summary statistics
    summary_stats = get_summary_stats(db)
    summary_response = AnalyticsSummaryResponse(**summary_stats)

    # Fetch recent incidents (max 10)
    incidents_response = get_incidents(db, page=1, page_size=10)
    recent_incidents = incidents_response.items

    # Fetch recent alerts (max 10)
    alerts_response = get_alerts(db, page=1, page_size=10)
    recent_alerts = alerts_response.items

    return DashboardOverviewResponse(
        summary=summary_response,
        recentIncidents=recent_incidents,
        recentAlerts=recent_alerts
    )
