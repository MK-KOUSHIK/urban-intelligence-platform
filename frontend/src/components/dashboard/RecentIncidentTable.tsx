import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Column } from '../ui/Table';
import { Incident } from '../../types';
import { IncidentTypeBadge } from '../common/IncidentTypeBadge';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../ui/Button';
import { MapPin, Eye } from 'lucide-react';

interface RecentIncidentTableProps {
  incidents: Incident[];
  isLoading?: boolean;
}

export const RecentIncidentTable: React.FC<RecentIncidentTableProps> = ({
  incidents,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const columns: Column<Incident>[] = [
    {
      header: 'Incident Type',
      cell: (row) => <IncidentTypeBadge type={row.incidentType} size="sm" />,
    },
    {
      header: 'Severity',
      cell: (row) => <SeverityBadge severity={row.severity} size="sm" />,
    },
    {
      header: 'Confidence',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {(row.confidence * 100).toFixed(0)}%
        </span>
      ),
    },
    {
      header: 'Time',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Location',
      cell: (row) =>
        row.location ? (
          <span className="flex items-center gap-1 font-mono text-xs text-slate-400">
            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
            {row.location.latitude.toFixed(4)}, {row.location.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-slate-500 font-mono text-xs">N/A</span>
        ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/incidents/${row.id}`);
          }}
          leftIcon={<Eye className="h-3 w-3" />}
          className="text-xs font-mono py-1 px-2.5 border-slate-700 hover:bg-slate-800"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          Recent Operational Incidents Log
        </h3>
        <span className="text-xs font-mono text-slate-500">
          {incidents.length} recent record{incidents.length === 1 ? '' : 's'}
        </span>
      </div>

      <Table
        columns={columns}
        data={incidents}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No operational incidents recorded in the command center database."
      />
    </div>
  );
};
