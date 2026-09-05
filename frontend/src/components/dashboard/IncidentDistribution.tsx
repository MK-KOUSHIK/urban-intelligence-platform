import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { AnalyticsSummary } from '../../types';
import { Activity, ShieldAlert, AlertTriangle } from 'lucide-react';

interface IncidentDistributionProps {
  summary: AnalyticsSummary;
}

export const IncidentDistribution: React.FC<IncidentDistributionProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Incident Status Distribution */}
      <Card variant="outline" className="border-slate-800 bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Incident Operational Status Breakdown
          </CardTitle>
          <span className="text-xs font-mono text-slate-400">Total: {summary.totalIncidents}</span>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-red-400">Open (Unassigned/Active)</span>
              <span className="font-bold text-slate-200">{summary.openIncidents}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-300"
                style={{
                  width: `${summary.totalIncidents > 0 ? (summary.openIncidents / summary.totalIncidents) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-amber-400">Acknowledged (In Progress)</span>
              <span className="font-bold text-slate-200">{summary.acknowledgedIncidents}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{
                  width: `${summary.totalIncidents > 0 ? (summary.acknowledgedIncidents / summary.totalIncidents) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-400">Resolved (Closed)</span>
              <span className="font-bold text-slate-200">{summary.resolvedIncidents}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${summary.totalIncidents > 0 ? (summary.resolvedIncidents / summary.totalIncidents) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity & Alert Distribution */}
      <Card variant="outline" className="border-slate-800 bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Severity & Notification Breakdown
          </CardTitle>
          <span className="text-xs font-mono text-slate-400">Alerts: {summary.totalAlerts}</span>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-3 gap-3 text-center font-mono">
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-950/20">
            <div className="text-[10px] text-red-400 uppercase tracking-widest">High Severity</div>
            <div className="mt-1 text-xl font-bold text-red-300">{summary.highSeverityIncidents}</div>
          </div>
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-950/20">
            <div className="text-[10px] text-amber-400 uppercase tracking-widest">Medium Severity</div>
            <div className="mt-1 text-xl font-bold text-amber-300">{summary.mediumSeverityIncidents}</div>
          </div>
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-950/20">
            <div className="text-[10px] text-blue-400 uppercase tracking-widest">Low Severity</div>
            <div className="mt-1 text-xl font-bold text-blue-300">{summary.lowSeverityIncidents}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
