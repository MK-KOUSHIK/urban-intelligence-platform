import React from 'react';
import { Route, Bus } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Edit, Route as RouteIcon, Eye } from 'lucide-react';

interface RouteTableProps {
  routes: Route[];
  buses?: Bus[];
  isLoading?: boolean;
  isAdmin?: boolean;
  onEdit?: (route: Route) => void;
  onView?: (route: Route) => void;
}

export const RouteTable: React.FC<RouteTableProps> = ({
  routes,
  buses,
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

  if (routes.length === 0) {
    return (
      <EmptyState
        title="No routes registered."
        description="There are currently no transit routes defined in the registry."
        icon={<RouteIcon className="h-8 w-8 text-slate-400" />}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Route #</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Origin</th>
            <th className="px-4 py-3">Destination</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Assigned Buses</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {routes.map((r) => {
            const assignedBusCount = buses
              ? buses.filter((b) => b.routeId === r.id).length
              : 'N/A';

            return (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {r.routeNumber}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {r.name}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.origin}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.destination}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.isActive ? 'success' : 'secondary'}>
                    {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                  {assignedBusCount}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(r)}
                        aria-label={`View Route ${r.routeNumber}`}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(r)}
                        aria-label={`Edit Route ${r.routeNumber}`}
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
