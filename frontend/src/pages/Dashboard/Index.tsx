import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import { DashboardOverview } from '../../types';
import { MetricCard } from '../../components/cards/MetricCard';
import { IncidentCard } from '../../components/cards/IncidentCard';
import { AlertCard } from '../../components/cards/AlertCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { IncidentDistribution } from '../../components/dashboard/IncidentDistribution';
import { RecentIncidentTable } from '../../components/dashboard/RecentIncidentTable';
import { getErrorMessage } from '../../utils/formatters';
import { AlertOctagon, Bell, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';

import { useConnection } from '../../hooks/useConnection';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useConnection();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const overviewData = await dashboardApi.getOverview();
      setData(overviewData);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg || 'Unable to load command center data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribe((msg) => {
      if (
        msg.type === 'incident.created' ||
        msg.type === 'incident.updated' ||
        msg.type === 'alert.created' ||
        msg.type === 'alert.updated'
      ) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchDashboardData();
        }, 300);
      }
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [fetchDashboardData, subscribe]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase">
              Urban Intelligence Command Center
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Real-time operational overview, municipal telemetry, and automated alerts.
            </p>
          </div>
          <ConnectionStatus />
        </div>

        <ErrorState
          title="Unable to load command center data."
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase">
            Urban Intelligence Command Center
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Real-time operational overview, municipal telemetry, and automated alerts.
          </p>
        </div>
        <ConnectionStatus />
      </div>

      {/* QUICK NAVIGATION ACTIONS */}
      <QuickActions />

      {/* MAIN KPI METRICS ROW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 border-slate-800 bg-slate-900/60">
              <Skeleton className="h-4 w-24 mb-2 bg-slate-800" />
              <Skeleton className="h-8 w-16 mb-2 bg-slate-800" />
              <Skeleton className="h-3 w-32 bg-slate-800" />
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Total Incidents"
              value={data.summary.totalIncidents}
              subtitle="Logged in system database"
              icon={<AlertOctagon className="h-5 w-5 text-blue-400" />}
              variant="info"
            />
            <MetricCard
              title="Open Incidents"
              value={data.summary.openIncidents}
              subtitle="Requiring operator action"
              icon={<Activity className="h-5 w-5 text-red-400" />}
              variant="danger"
            />
            <MetricCard
              title="High Severity Active"
              value={data.summary.highSeverityIncidents}
              subtitle="Critical priority hazards"
              icon={<ShieldAlert className="h-5 w-5 text-amber-400" />}
              variant="warning"
            />
            <MetricCard
              title="Active System Alerts"
              value={data.summary.totalAlerts}
              subtitle={`${data.summary.unreadAlerts} unread notifications`}
              icon={<Bell className="h-5 w-5 text-purple-400" />}
              variant="default"
            />
          </>
        )}
      </div>

      {/* OPERATIONAL DISTRIBUTION BREAKDOWN */}
      {!isLoading && data && <IncidentDistribution summary={data.summary} />}

      {/* TWO-COLUMN OPERATIONAL FEEDS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Recent Incidents Feed */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="outline" className="border-slate-800 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-red-400" />
                Recent Incidents Feed
              </CardTitle>
              {!isLoading && data && (
                <span className="text-xs font-mono text-slate-400">
                  Showing {data.recentIncidents.length} items
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full bg-slate-800 rounded-lg" />
                ))
              ) : !data || data.recentIncidents.length === 0 ? (
                <EmptyState
                  title="No incidents detected"
                  description="There are currently no active or recorded traffic incidents in the command database."
                  icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />}
                />
              ) : (
                data.recentIncidents.slice(0, 5).map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Recent Alerts Feed */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="outline" className="border-slate-800 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                Recent System Alerts
              </CardTitle>
              {!isLoading && data && (
                <span className="text-xs font-mono text-slate-400">
                  Showing {data.recentAlerts.length} items
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full bg-slate-800 rounded-lg" />
                ))
              ) : !data || data.recentAlerts.length === 0 ? (
                <EmptyState
                  title="No active alerts"
                  description="All municipal alerts have been acknowledged or resolved."
                  icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />}
                />
              ) : (
                data.recentAlerts.slice(0, 5).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onClick={() => navigate('/alerts')}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* COMPACT RECENT INCIDENTS TABLE */}
      <RecentIncidentTable
        incidents={data?.recentIncidents || []}
        isLoading={isLoading}
      />
    </div>
  );
};
