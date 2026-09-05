import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Incident } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ExternalLink, Film, MapPin } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface IncidentTableProps {
  incidents: Incident[];
  isLoading?: boolean;
}

export const IncidentTable: React.FC<IncidentTableProps> = ({ incidents, isLoading = false }) => {
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/80 shadow-md">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-slate-800 bg-slate-950/80 font-mono text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Severity</th>
            <th className="px-4 py-3 font-semibold">Confidence</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Timestamp</th>
            <th className="px-4 py-3 font-semibold hidden md:table-cell">Location</th>
            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Device</th>
            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Bus</th>
            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Route</th>
            <th className="px-4 py-3 font-semibold hidden xl:table-cell">Recording</th>
            <th className="px-4 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800/60 font-mono text-xs text-slate-300">
          {incidents.map((inc) => (
            <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
              {/* ID */}
              <td className="px-4 py-3 font-bold text-slate-200">
                <span className="truncate max-w-[100px] inline-block">{inc.id}</span>
              </td>

              {/* Type */}
              <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                {inc.incidentType}
              </td>

              {/* Severity */}
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={getSeverityBadgeVariant(inc.severity)}>
                  {inc.severity?.toUpperCase()}
                </Badge>
              </td>

              {/* Confidence */}
              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                {Math.round((inc.confidence || 0) * 100)}%
              </td>

              {/* Status */}
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={getStatusBadgeVariant(inc.status)}>
                  {inc.status?.toUpperCase()}
                </Badge>
              </td>

              {/* Timestamp */}
              <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                {formatDateTime(inc.timestamp)}
              </td>

              {/* Location (md+) */}
              <td className="px-4 py-3 hidden md:table-cell text-slate-300 text-[11px] whitespace-nowrap">
                {inc.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                    {inc.location.latitude.toFixed(4)}, {inc.location.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-slate-500">N/A</span>
                )}
              </td>

              {/* Device (lg+) */}
              <td className="px-4 py-3 hidden lg:table-cell text-slate-300 text-[11px] whitespace-nowrap">
                {inc.deviceId || <span className="text-slate-500">N/A</span>}
              </td>

              {/* Bus (lg+) */}
              <td className="px-4 py-3 hidden lg:table-cell text-slate-300 text-[11px] whitespace-nowrap">
                {inc.busId || <span className="text-slate-500">N/A</span>}
              </td>

              {/* Route (lg+) */}
              <td className="px-4 py-3 hidden lg:table-cell text-slate-300 text-[11px] whitespace-nowrap">
                {inc.routeId || <span className="text-slate-500">N/A</span>}
              </td>

              {/* Recording (xl+) */}
              <td className="px-4 py-3 hidden xl:table-cell text-slate-300 text-[11px] whitespace-nowrap">
                {inc.recordingId ? (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Film className="h-3 w-3 shrink-0" />
                    {inc.recordingId}
                  </span>
                ) : (
                  <span className="text-slate-500">N/A</span>
                )}
              </td>

              {/* Action */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="font-mono text-xs gap-1 border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
                  aria-label={`View Incident ${inc.id}`}
                >
                  View
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
