import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapIncident } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { X, ExternalLink, MapPin, Clock, ShieldAlert, Cpu, Bus as BusIcon, Route as RouteIcon, Film } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface SelectedIncidentPanelProps {
  incident: MapIncident | null;
  onClose: () => void;
}

export const SelectedIncidentPanel: React.FC<SelectedIncidentPanelProps> = ({
  incident,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!incident) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center border border-slate-800 bg-slate-900/80 rounded-lg">
        <MapPin className="h-10 w-10 text-slate-600 mb-2" />
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          No Marker Selected
        </h4>
        <p className="text-[11px] text-slate-500 max-w-xs mt-1">
          Click any incident marker on the live map to inspect telemetry, device identities, and status.
        </p>
      </div>
    );
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'danger';
      case 'acknowledged':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <div className="h-full w-full flex flex-col border border-slate-800 bg-slate-900 rounded-lg p-4 shadow-xl overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-mono tracking-wide text-white">
              {incident.incidentType || 'INCIDENT'}
            </h3>
            <Badge variant={getSeverityBadgeVariant(incident.severity)}>
              {incident.severity?.toUpperCase()}
            </Badge>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            ID: <span className="text-slate-200">{incident.id}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Details Grid */}
      <div className="py-4 space-y-4 text-xs flex-1">
        {/* Status & Confidence */}
        <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-2.5 rounded border border-slate-800">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Status</span>
            <Badge variant={getStatusBadgeVariant(incident.status)} className="mt-1">
              {incident.status?.toUpperCase()}
            </Badge>
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Confidence</span>
            <span className="font-mono font-bold text-slate-200 text-sm">
              {Math.round((incident.confidence || 0) * 100)}%
            </span>
          </div>
        </div>

        {/* Timestamp & Coordinates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="font-mono text-[11px]">{formatDateTime(incident.timestamp)}</span>
          </div>

          <div className="flex items-start gap-2 text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="font-mono text-[11px]">
              <div>
                Lat: <span className="text-slate-200">{incident.location?.latitude?.toFixed(6) ?? 'N/A'}</span>
              </div>
              <div>
                Lon: <span className="text-slate-200">{incident.location?.longitude?.toFixed(6) ?? 'N/A'}</span>
              </div>
              {incident.location?.accuracyMeters !== undefined && incident.location?.accuracyMeters !== null && (
                <div className="text-[10px] text-slate-500">
                  Accuracy: ±{incident.location.accuracyMeters}m
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Identities / Relational IDs */}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
            Telematics Identifiers
          </h4>

          <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/30">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Cpu className="h-3 w-3 text-emerald-400" /> Device:
              </span>
              <span className="text-slate-200 font-semibold">{incident.deviceId || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/30">
              <span className="flex items-center gap-1.5 text-slate-400">
                <BusIcon className="h-3 w-3 text-amber-400" /> Bus:
              </span>
              <span className="text-slate-200 font-semibold">{incident.busId || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/30">
              <span className="flex items-center gap-1.5 text-slate-400">
                <RouteIcon className="h-3 w-3 text-blue-400" /> Route:
              </span>
              <span className="text-slate-200 font-semibold">{incident.routeId || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Button */}
      <div className="pt-3 border-t border-slate-800">
        <Button
          variant="primary"
          size="sm"
          className="w-full font-mono text-xs gap-1.5 justify-center"
          onClick={() => navigate(`/incidents/${incident.id}`)}
          aria-label="View Full Incident"
        >
          View Full Incident
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
