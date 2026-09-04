from pydantic import BaseModel, Field
from typing import List

class AnalyticsSummaryResponse(BaseModel):
    total_incidents: int = Field(default=0, alias="totalIncidents")
    open_incidents: int = Field(default=0, alias="openIncidents")
    acknowledged_incidents: int = Field(default=0, alias="acknowledgedIncidents")
    resolved_incidents: int = Field(default=0, alias="resolvedIncidents")
    high_severity_incidents: int = Field(default=0, alias="highSeverityIncidents")
    medium_severity_incidents: int = Field(default=0, alias="mediumSeverityIncidents")
    low_severity_incidents: int = Field(default=0, alias="lowSeverityIncidents")
    total_alerts: int = Field(default=0, alias="totalAlerts")
    unread_alerts: int = Field(default=0, alias="unreadAlerts")
    acknowledged_alerts: int = Field(default=0, alias="acknowledgedAlerts")
    resolved_alerts: int = Field(default=0, alias="resolvedAlerts")

    class Config:
        populate_by_name = True


class IncidentTypeCount(BaseModel):
    incident_type: str = Field(alias="incidentType")
    count: int

    class Config:
        populate_by_name = True


class IncidentTypeCountResponse(BaseModel):
    items: List[IncidentTypeCount]


class SeverityCount(BaseModel):
    severity: str
    count: int


class SeverityCountResponse(BaseModel):
    items: List[SeverityCount]


class AlertStatusCount(BaseModel):
    status: str
    count: int


class AlertStatusCountResponse(BaseModel):
    items: List[AlertStatusCount]
