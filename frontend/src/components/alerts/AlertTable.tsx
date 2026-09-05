import React from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface AlertTableProps {
  alerts: Alert[];
  isAdmin: boolean;
  onAcknowledge: (alertId: string) => void;
  onResolveClick: (alertId: string) => void;
  isLoading?: boolean;
  isMutating?: boolean;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  alerts,
  isAdmin,
  onAcknowledge,
  onResolveClick,
  isLoading = false,
  isMutating = false,
}) => {
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
      case 'unread':
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
      <table className="w-full border-collapse text-left text-xs font-mono">
        <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Alert ID</th>
            <th className="px-4 py-3 font-semibold">Alert Type</th>
            <th className="px-4 py-3 font-semibold">Severity</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Incident</th>
            <th className="px-4 py-3 font-semibold">Timestamp</th>
            <th className="px-4 py-3 font-semibold hidden md:table-cell">Message Details</th>
            <th className="px-4 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
          {alerts.map((alt) => (
            <tr key={alt.id} className="hover:bg-slate-800/40 transition-colors">
              {/* Alert ID */}
              <td className="px-4 py-3 font-bold text-slate-200">
                <span className="truncate max-w-[90px] inline-block">{alt.id}</span>
              </td>

              {/* Alert Type */}
              <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                {alt.alertType}
              </td>

              {/* Severity */}
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={getSeverityBadgeVariant(alt.severity)}>
                  {alt.severity?.toUpperCase()}
                </Badge>
              </td>

              {/* Status */}
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={getStatusBadgeVariant(alt.status)}>
                  {alt.status?.toUpperCase()}
                </Badge>
              </td>

              {/* Incident ID & Link */}
              <td className="px-4 py-3 whitespace-nowrap">
                {alt.incidentId ? (
                  <Link
                    to={`/incidents/${alt.incidentId}`}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline focus:outline-hidden cursor-pointer"
                    aria-label={`View Incident ${alt.incidentId}`}
                  >
                    {alt.incidentId}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                ) : (
                  <span className="text-slate-500">N/A</span>
                )}
              </td>

              {/* Timestamp */}
              <TableCellDate timestamp={alt.createdAt} />

              {/* Message Details (md+) */}
              <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-[11px] max-w-xs truncate">
                {alt.message || 'N/A'}
              </td>

              {/* Actions (Admin vs Non-Admin) */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {isAdmin ? (
                  <div className="flex items-center justify-end gap-1.5">
                    {alt.status === 'unread' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAcknowledge(alt.id)}
                          disabled={isMutating}
                          className="text-[11px] font-mono border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 py-0.5 px-2"
                          aria-label={`Acknowledge Alert ${alt.id}`}
                        >
                          Acknowledge
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onResolveClick(alt.id)}
                          disabled={isMutating}
                          className="text-[11px] font-mono bg-emerald-600 hover:bg-emerald-500 text-white py-0.5 px-2"
                          aria-label={`Resolve Alert ${alt.id}`}
                        >
                          Resolve
                        </Button>
                      </>
                    )}

                    {alt.status === 'acknowledged' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onResolveClick(alt.id)}
                        disabled={isMutating}
                        className="text-[11px] font-mono bg-emerald-600 hover:bg-emerald-500 text-white py-0.5 px-2"
                        aria-label={`Resolve Alert ${alt.id}`}
                      >
                        Resolve
                      </Button>
                    )}

                    {alt.status === 'resolved' && (
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 justify-end">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Resolved
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">Read-Only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TableCellDate: React.FC<{ timestamp: string }> = ({ timestamp }) => (
  <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
    {formatDateTime(timestamp)}
  </td>
);
