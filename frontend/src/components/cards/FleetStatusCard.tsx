import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Bus, Device, Route } from '../../types';
import { Bus as BusIcon, Cpu, Navigation } from 'lucide-react';

export interface FleetStatusCardProps {
  type: 'bus' | 'device' | 'route';
  data: Bus | Device | Route;
}

export const FleetStatusCard: React.FC<FleetStatusCardProps> = ({ type, data }) => {
  if (type === 'bus') {
    const bus = data as Bus;
    return (
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BusIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
              {bus.busNumber}
            </span>
          </div>
          <StatusBadge status={bus.isActive ? 'active' : 'inactive'} size="sm" />
        </div>
        <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-400 font-mono">
          <p>REG: {bus.registrationNumber}</p>
          <p>OPERATOR: {bus.operator}</p>
        </div>
      </Card>
    );
  }

  if (type === 'device') {
    const device = data as Device;
    return (
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
              {device.deviceIdentifier}
            </span>
          </div>
          <StatusBadge status={device.isActive ? 'active' : 'inactive'} size="sm" />
        </div>
        <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-400 font-mono">
          <p>NAME: {device.name}</p>
          <p>TYPE: {device.deviceType}</p>
        </div>
      </Card>
    );
  }

  const route = data as Route;
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
            ROUTE {route.routeNumber}
          </span>
        </div>
        <StatusBadge status={route.isActive ? 'active' : 'inactive'} size="sm" />
      </div>
      <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-400">
        <p className="font-semibold text-slate-800 dark:text-slate-200">{route.name}</p>
        <p className="font-mono text-[11px]">{route.origin} ➔ {route.destination}</p>
      </div>
    </Card>
  );
};
