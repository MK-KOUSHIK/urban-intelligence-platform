import React from 'react';
import { Route, Bus, Device } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Route as RouteIcon, Bus as BusIcon, Cpu, ArrowRight } from 'lucide-react';

interface FleetRelationshipsProps {
  routes: Route[];
  buses: Bus[];
  devices: Device[];
}

export const FleetRelationships: React.FC<FleetRelationshipsProps> = ({
  routes,
  buses,
  devices,
}) => {
  // Map buses by routeId
  const busesByRoute = new Map<string, Bus[]>();
  const unassignedBuses: Bus[] = [];

  buses.forEach((bus) => {
    if (bus.routeId) {
      const list = busesByRoute.get(bus.routeId) || [];
      list.push(bus);
      busesByRoute.set(bus.routeId, list);
    } else {
      unassignedBuses.push(bus);
    }
  });

  // Map devices by busId
  const devicesByBus = new Map<string, Device[]>();
  const unassignedDevices: Device[] = [];

  devices.forEach((device) => {
    if (device.busId) {
      const list = devicesByBus.get(device.busId) || [];
      list.push(device);
      devicesByBus.set(device.busId, list);
    } else {
      unassignedDevices.push(device);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <RouteIcon className="h-4 w-4 text-emerald-500" />
          Fleet Relationships (Route → Bus → Device)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {routes.length === 0 && buses.length === 0 && devices.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">No fleet assets registered.</div>
        ) : (
          <div className="space-y-4">
            {routes.map((route) => {
              const assignedBuses = busesByRoute.get(route.id) || [];

              return (
                <div
                  key={route.id}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  {/* Route Header */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs border border-emerald-500/20">
                      Route {route.routeNumber}
                    </span>
                    <span>{route.name}</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({route.origin} → {route.destination})
                    </span>
                  </div>

                  {/* Buses assigned to Route */}
                  {assignedBuses.length === 0 ? (
                    <div className="pl-6 text-xs text-slate-400 italic">No buses assigned to this route.</div>
                  ) : (
                    <div className="pl-4 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 ml-3">
                      {assignedBuses.map((bus) => {
                        const assignedDevices = devicesByBus.get(bus.id) || [];

                        return (
                          <div key={bus.id} className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <BusIcon className="h-3.5 w-3.5 text-blue-500" />
                              <span className="font-mono">{bus.busNumber}</span>
                              <span className="text-slate-400">({bus.registrationNumber})</span>
                            </div>

                            {/* Devices assigned to Bus */}
                            {assignedDevices.length === 0 ? (
                              <div className="pl-8 text-[11px] text-slate-400 italic">
                                No sensing devices on this bus.
                              </div>
                            ) : (
                              <div className="pl-6 space-y-1 ml-4 border-l border-slate-200 dark:border-slate-800">
                                {assignedDevices.map((device) => (
                                  <div
                                    key={device.id}
                                    className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400"
                                  >
                                    <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                                    <Cpu className="h-3 w-3 text-purple-500" />
                                    <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                                      {device.deviceIdentifier}
                                    </span>
                                    <span>— {device.name}</span>
                                    <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                                      {device.deviceType}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned Assets */}
            {(unassignedBuses.length > 0 || unassignedDevices.length > 0) && (
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Unassigned Fleet Assets
                </div>

                {unassignedBuses.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <BusIcon className="h-3.5 w-3.5 text-amber-500" />
                      Unassigned Buses ({unassignedBuses.length}):
                    </div>
                    <div className="flex flex-wrap gap-2 pl-5">
                      {unassignedBuses.map((bus) => (
                        <span
                          key={bus.id}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          {bus.busNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {unassignedDevices.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-purple-500" />
                      Unassigned Sensing Devices ({unassignedDevices.length}):
                    </div>
                    <div className="flex flex-wrap gap-2 pl-5">
                      {unassignedDevices.map((device) => (
                        <span
                          key={device.id}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          {device.deviceIdentifier} ({device.name})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
