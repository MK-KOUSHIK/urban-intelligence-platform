from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from app.database.deps import get_db
from app.models.users import User
from app.auth.deps import require_roles
from app.schemas.api import AlertListResponse, AlertResponse, AlertUpdateRequest
from app.services.alerts import get_alerts, update_alert
from app.services.websocket_manager import manager

router = APIRouter()

@router.get("/api/alerts", response_model=AlertListResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alertType: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    """
    Get a paginated list of alerts.
    """
    return get_alerts(
        db=db,
        page=page,
        page_size=pageSize,
        status=status,
        severity=severity,
        alert_type=alertType
    )

@router.patch("/api/alerts/{alert_id}", response_model=AlertResponse)
def patch_alert(
    alert_id: str, 
    request: AlertUpdateRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "traffic_authority", "municipal_authority"]))
):
    """
    Update an alert's status.
    """
    try:
        updated = update_alert(db, alert_id, request.status)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
            
        background_tasks.add_task(
            manager.broadcast,
            {"type": "alert.updated", "data": updated.model_dump(mode='json')}
        )
            
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
