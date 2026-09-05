import React from 'react';
import { Card } from '../ui/Card';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { IncidentTypeBadge } from '../common/IncidentTypeBadge';
import { Incident } from '../../types';
import { MapPin, Clock, Video } from 'lucide-react';

export interface IncidentCardProps {
  incident: Incident;
  onClick?: () => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onClick }) => {
  return (
    <Card
      className="cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <IncidentTypeBadge type={incident.incidentType} size="sm" />
          <SeverityBadge severity={incident.severity} size="sm" />
        </div>
        <StatusBadge status={incident.status} size="sm" />
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{new Date(incident.timestamp).toLocaleString()}</span>
        </div>

        {incident.location && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}
            </span>
          </div>
        )}

        {incident.recordingId && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span>REC: {incident.recordingId}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
