import React from 'react';
import { Device, Bus } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Edit, Cpu, Key, Eye, CheckCircle2, XCircle } from 'lucide-react';

interface DeviceTableProps {
  devices: Device[];
  buses?: Bus[];
  isLoading?: boolean;
  isAdmin?: boolean;
  onEdit?: (device: Device) => void;
  onView?: (device: Device) => void;
  onGenerateKey?: (device: Device) => void;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  buses = [],
  isLoading = false,
  isAdmin = false,
  onEdit,
  onView,
  onGenerateKey,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <EmptyState
        title="No devices registered."
        description="There are currently no IoT or mobile sensing devices registered."
        icon={<Cpu className="h-8 w-8 text-slate-400" />}
      />
    );
  }

  const busMap = new Map<string, Bus>();
  buses.forEach((b) => busMap.set(b.id, b));

  const formatLastSeen = (lastSeenAt?: string | null) => {
    if (!lastSeenAt) return { text: 'N/A', status: 'na' };
    const date = new Date(lastSeenAt);
    if (isNaN(date.getTime())) return { text: 'N/A', status: 'na' };

    const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (diffMinutes < 60) {
      return { text: `Recently seen (${diffMinutes}m ago)`, status: 'recent' };
    } else if (diffMinutes < 1440) {
      return { text: `Seen ${Math.floor(diffMinutes / 60)}h ago`, status: 'recent' };
    } else {
      return { text: `Not recently seen (${date.toLocaleDateString()})`, status: 'stale' };
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Device Identifier</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Assigned Bus</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Seen</th>
            <th className="px-4 py-3">Credentials</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {devices.map((d) => {
            const assignedBus = d.busId ? busMap.get(d.busId) : null;
            const busLabel = assignedBus
              ? `Bus ${assignedBus.busNumber}`
              : 'Unassigned';

            const lastSeenInfo = formatLastSeen(d.lastSeenAt);

            return (
              <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {d.deviceIdentifier}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {d.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {d.deviceType}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {assignedBus ? (
                    <span className="text-emerald-600 dark:text-emerald-400">{busLabel}</span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={d.isActive ? 'success' : 'secondary'}>
                    {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs">
                  {lastSeenInfo.status === 'recent' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {lastSeenInfo.text}
                    </span>
                  ) : lastSeenInfo.status === 'stale' ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {lastSeenInfo.text}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {d.hasCredentials ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Key Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <XCircle className="h-3.5 w-3.5" /> No Key
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(d)}
                        aria-label={`View Device ${d.deviceIdentifier}`}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(d)}
                        aria-label={`Edit Device ${d.deviceIdentifier}`}
                        className="h-8 px-2 py-1 gap-1 text-xs"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {isAdmin && onGenerateKey && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onGenerateKey(d)}
                        aria-label={`Generate Key for ${d.deviceIdentifier}`}
                        className="h-8 px-2 py-1 gap-1 text-xs border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Key className="h-3.5 w-3.5" /> Key
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
