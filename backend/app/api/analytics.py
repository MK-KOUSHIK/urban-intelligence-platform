from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database.deps import get_db
from app.auth.deps import require_roles
from app.models.users import User
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    IncidentTypeCountResponse,
    SeverityCountResponse,
    AlertStatusCountResponse
)
from app.services import analytics

router = APIRouter()

# All roles can access analytics
analytics_roles = ["admin", "traffic_authority", "municipal_authority"]

def validate_date_range(from_dt: Optional[datetime], to_dt: Optional[datetime]):
    if from_dt and to_dt and from_dt > to_dt:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from timestamp must be less than or equal to to timestamp"
        )

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(analytics_roles))
):
    validate_date_range(from_dt, to_dt)
    stats = analytics.get_summary_stats(db, from_dt, to_dt)
    return stats

@router.get("/incidents-by-type", response_model=IncidentTypeCountResponse)
def get_incidents_by_type(
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(analytics_roles))
):
    validate_date_range(from_dt, to_dt)
    items = analytics.get_incidents_by_type(db, from_dt, to_dt)
    return {"items": items}

@router.get("/incidents-by-severity", response_model=SeverityCountResponse)
def get_incidents_by_severity(
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(analytics_roles))
):
    validate_date_range(from_dt, to_dt)
    items = analytics.get_incidents_by_severity(db, from_dt, to_dt)
    return {"items": items}

@router.get("/alerts-by-status", response_model=AlertStatusCountResponse)
def get_alerts_by_status(
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(analytics_roles))
):
    validate_date_range(from_dt, to_dt)
    items = analytics.get_alerts_by_status(db, from_dt, to_dt)
    return {"items": items}
