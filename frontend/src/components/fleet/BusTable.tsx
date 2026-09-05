import React from 'react';
import { Bus, Route } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Edit, Bus as BusIcon, Eye } from 'lucide-react';

interface BusTableProps {
  buses: Bus[];
  routes?: Route[];
  isLoading?: boolean;
  isAdmin?: boolean;
  onEdit?: (bus: Bus) => void;
  onView?: (bus: Bus) => void;
}

export const BusTable: React.FC<BusTableProps> = ({
  buses,
  routes = [],
  isLoading = false,
  isAdmin = false,
  onEdit,
  onView,
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

  if (buses.length === 0) {
    return (
      <EmptyState
        title="No buses registered."
        description="There are currently no active or inactive buses in the registry."
        icon={<BusIcon className="h-8 w-8 text-slate-400" />}
      />
    );
  }

  const routeMap = new Map<string, Route>();
  routes.forEach((r) => routeMap.set(r.id, r));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Bus Number</th>
            <th className="px-4 py-3">Registration #</th>
            <th className="px-4 py-3">Operator</th>
            <th className="px-4 py-3">Assigned Route</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {buses.map((b) => {
            const assignedRoute = b.routeId ? routeMap.get(b.routeId) : null;
            const routeLabel = assignedRoute
              ? `Route ${assignedRoute.routeNumber} — ${assignedRoute.name}`
              : 'Unassigned';

            return (
              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {b.busNumber}
                </td>
                <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                  {b.registrationNumber}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{b.operator}</td>
                <td className="px-4 py-3 font-medium">
                  {assignedRoute ? (
                    <span className="text-blue-600 dark:text-blue-400">{routeLabel}</span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={b.isActive ? 'success' : 'secondary'}>
                    {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(b)}
                        aria-label={`View Bus ${b.busNumber}`}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(b)}
                        aria-label={`Edit Bus ${b.busNumber}`}
                        className="h-8 px-2 py-1 gap-1 text-xs"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
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
