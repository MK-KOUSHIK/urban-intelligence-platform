import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Recording } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { formatDateTime, formatDuration, formatFileSize } from '../../utils/formatters';
import { Eye, Film } from 'lucide-react';

interface RecordingTableProps {
  recordings: Recording[];
  isLoading?: boolean;
  onView?: (recording: Recording) => void;
}

export const RecordingTable: React.FC<RecordingTableProps> = ({
  recordings,
  isLoading = false,
  onView,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <EmptyState
        title="No recordings available."
        description="There are currently no video recordings matching the criteria."
        icon={<Film className="h-8 w-8 text-slate-400" />}
      />
    );
  }

  const getStatusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'processed':
      case 'uploaded':
        return 'success';
      case 'uploading':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'error':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Recording ID</th>
            <th className="px-4 py-3">Device</th>
            <th className="px-4 py-3">Bus</th>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">Start Time</th>
            <th className="px-4 py-3">End Time</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">File Size</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {recordings.map((rec) => (
            <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {rec.recordingId}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                {rec.deviceId ? (
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {rec.deviceId}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {rec.busId ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Bus {rec.busId}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {rec.routeId ? (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Route {rec.routeId}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                {formatDateTime(rec.startTime)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                {formatDateTime(rec.endTime)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                {formatDuration(rec.durationSeconds)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                {formatFileSize(rec.fileSizeBytes)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={getStatusVariant(rec.status)}>
                  {rec.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (onView ? onView(rec) : navigate(`/recordings/${rec.id}`))}
                  aria-label={`View Recording ${rec.recordingId}`}
                  className="h-8 px-2 py-1 gap-1 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
