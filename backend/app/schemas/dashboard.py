from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.schemas.api import IncidentResponse, AlertResponse
from app.schemas.analytics import AnalyticsSummaryResponse

class BackendStatusResponse(BaseModel):
    status: str
    service: str
    version: str

class DashboardOverviewResponse(BaseModel):
    summary: AnalyticsSummaryResponse
    recentIncidents: List[IncidentResponse]
    recentAlerts: List[AlertResponse]
