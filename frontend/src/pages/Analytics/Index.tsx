import React, { useState, useEffect, useCallback } from 'react';
import { analyticsApi, DateRangeParams } from '../../api/analytics';
import { AnalyticsSummary, IncidentTypeCount, SeverityCount, AlertStatusCount } from '../../types';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { AnalyticsFilters } from '../../components/analytics/AnalyticsFilters';
import { OperationalInsights } from '../../components/analytics/OperationalInsights';
import { BarChartCard } from '../../components/charts/BarChartCard';
import { DonutChartCard } from '../../components/charts/DonutChartCard';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { RefreshCw, Activity, AlertOctagon, Bell, CheckCircle2, ShieldAlert, PieChart } from 'lucide-react';
import { getErrorMessage } from '../../utils/formatters';

export const AnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<DateRangeParams>({});
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [types, setTypes] = useState<IncidentTypeCount[]>([]);
  const [severities, setSeverities] = useState<SeverityCount[]>([]);
  const [alertStatuses, setAlertStatuses] = useState<AlertStatusCount[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (params: DateRangeParams) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    try {
      const [summaryRes, typesRes, severitiesRes, alertsRes] = await Promise.all([
        analyticsApi.getSummary(params),
        analyticsApi.getIncidentsByType(params),
        analyticsApi.getIncidentsBySeverity(params),
        analyticsApi.getAlertsByStatus(params),
      ]);

      setSummary(summaryRes);
      setTypes(typesRes.items || []);
      setSeverities(severitiesRes.items || []);
      setAlertStatuses(alertsRes.items || []);
    } catch (err: any) {
      console.error('Failed to load analytics datasets:', err);
      setIsError(true);
      if (err.response?.status === 422) {
        setErrorMessage(
          typeof err.response?.data?.detail === 'string'
            ? err.response.data.detail
            : 'From timestamp must be less than or equal to To timestamp.'
        );
      } else {
        setErrorMessage(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(filters);
  }, [fetchAnalytics, filters]);

  const handleApplyFilters = (newFilters: DateRangeParams) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  // Transform severities data for DonutChartCard ({ name, value })
  const severityDonutData = severities.map((item) => ({
    name: item.severity.toUpperCase(),
    value: item.count,
  }));

  // Transform incident types data for BarChartCard
  const formattedTypesData = types.map((item) => ({
    incidentType: item.incidentType.replace(/_/g, ' '),
    count: item.count,
  }));

  // Transform alert statuses data for BarChartCard
  const formattedAlertStatusesData = alertStatuses.map((item) => ({
    status: item.status.toUpperCase(),
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            Analytics & Insights
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Operational intelligence across incidents, alerts, and network activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionStatus showWebSocket={true} />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(filters)}
            disabled={isLoading}
            className="gap-1.5 font-mono text-xs border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
            aria-label="Refresh Analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Filter Control Bar */}
      <AnalyticsFilters
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
        externalError={errorMessage && isError ? errorMessage : null}
      />

      {/* Top Level Error State */}
      {isError ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <ErrorState
              title="Unable to load analytics data."
              message={errorMessage || 'Failed to connect to backend analytics services.'}
              onRetry={() => fetchAnalytics(filters)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Total Incidents
                  </span>
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
                  {isLoading ? '...' : summary?.totalIncidents ?? 0}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Sensed Network</span>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400">
                    Open Incidents
                  </span>
                  <AlertOctagon className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-amber-400 tracking-tight">
                  {isLoading ? '...' : summary?.openIncidents ?? 0}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Pending Dispatch</span>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-rose-400">
                    High Severity
                  </span>
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-rose-400 tracking-tight">
                  {isLoading ? '...' : summary?.highSeverityIncidents ?? 0}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Critical Hazards</span>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Total Alerts
                  </span>
                  <Bell className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
                  {isLoading ? '...' : summary?.totalAlerts ?? 0}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Dispatched Alerts</span>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-rose-400">
                    Unread Alerts
                  </span>
                  <Bell className="h-4 w-4 text-rose-500" />
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-rose-400 tracking-tight">
                  {isLoading ? '...' : summary?.unreadAlerts ?? 0}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Action Required</span>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                    Resolved Rate
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  {isLoading
                    ? '...'
                    : summary?.totalIncidents && summary.totalIncidents > 0
                    ? `${Math.round((summary.resolvedIncidents / summary.totalIncidents) * 100)}%`
                    : '0%'}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Close Efficiency</span>
              </CardContent>
            </Card>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incident Volume by Hazard Category */}
            <BarChartCard
              title="Incident Volume by Hazard Category"
              data={formattedTypesData}
              xKey="incidentType"
              yKey="count"
              barColor="#3b82f6"
              isLoading={isLoading}
              isError={isError}
              onRetry={() => fetchAnalytics(filters)}
            />

            {/* Severity Classification Share */}
            <DonutChartCard
              title="Severity Distribution Share"
              data={severityDonutData}
              colors={['#ef4444', '#f59e0b', '#3b82f6']}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => fetchAnalytics(filters)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alert Status Breakdown */}
            <BarChartCard
              title="Alert Status Breakdown"
              data={formattedAlertStatusesData}
              xKey="status"
              yKey="count"
              barColor="#f59e0b"
              isLoading={isLoading}
              isError={isError}
              onRetry={() => fetchAnalytics(filters)}
            />

            {/* Operational Insights Summary */}
            <OperationalInsights
              summary={summary}
              types={types}
              severities={severities}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};
