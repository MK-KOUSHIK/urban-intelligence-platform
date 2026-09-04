from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import BackgroundTasks
from app.services.websocket_manager import manager

from app.schemas.events import AIEvent
from app.models.events import Event as DBEvent
from app.schemas.api import EventIngestResponse, AcceptedEvent, DuplicateEvent, EventError

def process_events_batch(
    db: Session,
    events_data: list[Dict[str, Any]],
    background_tasks: BackgroundTasks = None,
    authenticated_device=None,  # Device ORM object from X-Device-Key auth (or None for tests)
) -> EventIngestResponse:
    accepted = []
    duplicates = []
    errors = []
    
    for raw_event in events_data:
        event_id = raw_event.get("eventId")
        
        try:
            # 1. Parse and validate
            validated_event = AIEvent.model_validate(raw_event)
            
            # 2. Extract strictly required idempotency key
            if not validated_event.event_id:
                errors.append(EventError(eventId=None, field="eventId", message="eventId is required"))
                continue
                
            event_id = validated_event.event_id
            
            # 3. Idempotency Check — BEFORE resolution so duplicates always short-circuit
            existing = db.query(DBEvent).filter(DBEvent.event_id == event_id).first()
            if existing:
                duplicates.append(DuplicateEvent(eventId=event_id, status="already_exists"))
                continue
                
            # 4. Resolve fleet identity
            # Authenticated device is authoritative; payload deviceId must match or be absent.
            device_id = None
            bus_id = None
            route_id = None

            if authenticated_device is not None:
                # Device-authenticated path
                payload_device_id = validated_event.device_id

                if payload_device_id and payload_device_id != authenticated_device.device_identifier:
                    # Impersonation attempt — reject this event in the batch
                    errors.append(EventError(
                        eventId=event_id,
                        field="deviceId",
                        message=(
                            f"deviceId '{payload_device_id}' does not match authenticated device "
                            f"'{authenticated_device.device_identifier}'. Impersonation rejected."
                        ),
                    ))
                    continue

                # Use authenticated device identity
                from app.services.registry import resolve_device_identity
                resolved = resolve_device_identity(db, authenticated_device.device_identifier)
                device_id = resolved.device_id
                bus_id = resolved.bus_id
                route_id = resolved.route_id

            elif validated_event.device_id:
                # Legacy path (no device auth but deviceId present — for tests using overridden client)
                from app.services.registry import resolve_device_identity
                resolved = resolve_device_identity(db, validated_event.device_id)
                device_id = resolved.device_id
                bus_id = resolved.bus_id
                route_id = resolved.route_id

            # 5. Generate received_at
            received_time = datetime.now(timezone.utc)
            
            # 6. Map to DB Event — include resolved fleet identity
            db_event = DBEvent(
                event_id=event_id,
                event_type=validated_event.event_type.value,
                confidence=validated_event.confidence,
                timestamp=validated_event.timestamp,
                received_at=received_time,
                recording_id=validated_event.recording_id,
                latitude=validated_event.location.latitude if validated_event.location else None,
                longitude=validated_event.location.longitude if validated_event.location else None,
                accuracy_meters=validated_event.location.accuracy_meters if validated_event.location else None,
                bbox_left=validated_event.bounding_box.left if validated_event.bounding_box else None,
                bbox_top=validated_event.bounding_box.top if validated_event.bounding_box else None,
                bbox_right=validated_event.bounding_box.right if validated_event.bounding_box else None,
                bbox_bottom=validated_event.bounding_box.bottom if validated_event.bounding_box else None,
                device_id=device_id,
                bus_id=bus_id,
                route_id=route_id,
            )
            
            db.add(db_event)
            
            # 7. Map to Incident — copy resolved fleet identity
            from app.models.incidents import Incident
            from app.services.classification import classify_severity, map_event_to_incident_type
            from app.services.incidents import _map_incident_to_response
            import uuid
            
            incident_id = str(uuid.uuid4())
            incident_type = map_event_to_incident_type(validated_event.event_type.value)
            severity = classify_severity(validated_event.confidence)
            
            db_incident = Incident(
                incident_id=incident_id,
                event_id=event_id,
                incident_type=incident_type,
                severity=severity,
                confidence=validated_event.confidence,
                timestamp=validated_event.timestamp,
                latitude=validated_event.location.latitude if validated_event.location else None,
                longitude=validated_event.location.longitude if validated_event.location else None,
                accuracy_meters=validated_event.location.accuracy_meters if validated_event.location else None,
                recording_id=validated_event.recording_id,
                bbox_left=validated_event.bounding_box.left if validated_event.bounding_box else None,
                bbox_top=validated_event.bounding_box.top if validated_event.bounding_box else None,
                bbox_right=validated_event.bounding_box.right if validated_event.bounding_box else None,
                bbox_bottom=validated_event.bounding_box.bottom if validated_event.bounding_box else None,
                status="open",
                device_id=device_id,
                bus_id=bus_id,
                route_id=route_id,
            )
            db.add(db_incident)
            
            # 8. Evaluate rules and create alerts
            from app.services.alert_rules import evaluate_and_create_alerts
            from app.services.alerts import _map_alert_to_response
            new_alerts = evaluate_and_create_alerts(db, db_incident)
            
            db.commit()
            db.refresh(db_incident)
            
            # Broadcast Incident creation (WebSocket now carries identity fields)
            if background_tasks:
                incident_data = _map_incident_to_response(db_incident).model_dump(mode='json')
                background_tasks.add_task(
                    manager.broadcast, 
                    {"type": "incident.created", "data": incident_data}
                )
            
            # Broadcast Alert creation
            for alert in new_alerts:
                db.refresh(alert)
                if background_tasks:
                    alert_data = _map_alert_to_response(alert).model_dump(mode='json')
                    background_tasks.add_task(
                        manager.broadcast,
                        {"type": "alert.created", "data": alert_data}
                    )
            
            accepted.append(AcceptedEvent(
                eventId=event_id,
                status="created",
                incidentId=incident_id,
                deviceId=device_id,
                busId=bus_id,
                routeId=route_id,
            ))
            
        except ValidationError as e:
            for error in e.errors():
                loc = "->".join([str(l) for l in error["loc"]])
                msg = error["msg"]
                errors.append(EventError(eventId=event_id, field=loc, message=msg))
        except IntegrityError:
            db.rollback()
            duplicates.append(DuplicateEvent(eventId=event_id, status="already_exists"))
        except Exception as ex:
            db.rollback()
            errors.append(EventError(eventId=event_id, field="unknown", message=str(ex)))
            
    success = len(errors) == 0

    # Update last_seen_at for the authenticated device after processing
    # (update regardless of individual event success/failure in the batch,
    # as long as authentication itself succeeded)
    if authenticated_device is not None and len(accepted) > 0:
        authenticated_device.last_seen_at = datetime.now(timezone.utc)
        db.commit()

    return EventIngestResponse(
        success=success,
        accepted=accepted,
        duplicates=duplicates,
        errors=errors
    )
