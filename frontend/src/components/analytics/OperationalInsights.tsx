import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { AnalyticsSummary, IncidentTypeCount, SeverityCount } from '../../types';
import { Lightbulb, ShieldAlert, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';

interface OperationalInsightsProps {
  summary: AnalyticsSummary | null;
  types: IncidentTypeCount[];
  severities: SeverityCount[];
  isLoading?: boolean;
}

export const OperationalInsights: React.FC<OperationalInsightsProps> = ({
  summary,
  types,
  severities,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle>Operational Insights</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-xs text-slate-500 font-mono">
          Calculating telemetry statistics...
        </CardContent>
      </Card>
    );
  }

  // Derive highest incident category from real data
  const sortedTypes = [...types].sort((a, b) => b.count - a.count);
  const topType = sortedTypes[0] && sortedTypes[0].count > 0 ? sortedTypes[0] : null;

  // Derive highest severity category from real data
  const sortedSeverities = [...severities].sort((a, b) => b.count - a.count);
  const topSeverity = sortedSeverities[0] && sortedSeverities[0].count > 0 ? sortedSeverities[0] : null;

  // Calculate resolution percentage
  const totalIncidents = summary?.totalIncidents || 0;
  const resolvedIncidents = summary?.resolvedIncidents || 0;
  const resolutionPercentage =
    totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

  // Calculate unread alert ratio
  const totalAlerts = summary?.totalAlerts || 0;
  const unreadAlerts = summary?.unreadAlerts || 0;
  const unreadRatio = totalAlerts > 0 ? Math.round((unreadAlerts / totalAlerts) * 100) : 0;

  const hasData = summary || types.length > 0 || severities.length > 0;

  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-md">
      <CardHeader className="border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-slate-100">
            Operational Insights Summary
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {!hasData ? (
          <div className="py-6 text-center text-xs font-mono text-slate-500">
            Not enough data for this period to generate operational insights.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* Highest Incident Category */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-3 flex items-start gap-3">
              <Activity className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Highest Hazard Category
                </span>
                {topType ? (
                  <p className="text-slate-200 mt-0.5 font-semibold">
                    {topType.incidentType.replace(/_/g, ' ')} ({topType.count} incidents)
                  </p>
                ) : (
                  <p className="text-slate-500 mt-0.5 italic">No category data recorded</p>
                )}
              </div>
            </div>

            {/* Dominant Severity Category */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Dominant Severity Level
                </span>
                {topSeverity ? (
                  <p className="text-slate-200 mt-0.5 font-semibold">
                    {topSeverity.severity.toUpperCase()} ({topSeverity.count} occurrences)
                  </p>
                ) : (
                  <p className="text-slate-500 mt-0.5 italic">No severity data recorded</p>
                )}
              </div>
            </div>

            {/* Incident Resolution Percentage */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-3 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Incident Resolution Efficiency
                </span>
                <p className="text-slate-200 mt-0.5 font-semibold">
                  {resolutionPercentage}% resolved ({resolvedIncidents} of {totalIncidents})
                </p>
              </div>
            </div>

            {/* Unread Alert Ratio */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-3 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Unread Alert Ratio
                </span>
                <p className="text-slate-200 mt-0.5 font-semibold">
                  {unreadRatio}% unread ({unreadAlerts} of {totalAlerts} total alerts)
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
