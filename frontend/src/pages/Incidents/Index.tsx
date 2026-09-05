import React, { useState, useEffect, useCallback } from 'react';
import { incidentsApi, IncidentFilterParams } from '../../api/incidents';
import { Incident } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { IncidentFilters } from '../../components/incidents/IncidentFilters';
import { IncidentTable } from '../../components/incidents/IncidentTable';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { RefreshCw, AlertOctagon, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [filters, setFilters] = useState<IncidentFilterParams>({ page: 1, pageSize: 20 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Compute status summary from currently loaded dataset (or total)
  const openCount = incidents.filter((i) => i.status === 'open').length;
  const ackCount = incidents.filter((i) => i.status === 'acknowledged').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await incidentsApi.getIncidents({ ...filters, page, pageSize });
      setIncidents(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || Math.ceil((res.total || 0) / pageSize) || 1);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleApplyFilters = (newFilters: IncidentFilterParams) => {
    setPage(1);
    setFilters({ ...newFilters, page: 1, pageSize });
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ page: 1, pageSize });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            Incident Operations Log
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Filterable audit ledger of sensed road hazards, accidents, and municipal incidents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionStatus showWebSocket={true} />

          <Button
            variant="outline"
            size="sm"
            onClick={fetchIncidents}
            disabled={isLoading}
            className="gap-1.5 font-mono text-xs border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
            aria-label="Refresh Incidents"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
              Total Sensed
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
              {total}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-red-400">Open</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-red-400 tracking-tight">
              {openCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Acknowledged</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-400 tracking-tight">
              {ackCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">Resolved</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {resolvedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <IncidentFilters
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
      />

      {/* Content Area */}
      {isError ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <ErrorState
              title="Unable to load incident data."
              message="Failed to connect to the backend incident ledger API."
              onRetry={fetchIncidents}
            />
          </CardContent>
        </Card>
      ) : !isLoading && incidents.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <EmptyState
              title="No incidents match the selected filters."
              description="Try adjusting severity, type, or date criteria, or clear all filters."
              icon={<AlertOctagon className="h-10 w-10 text-slate-400" />}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="font-mono text-xs border-slate-700"
                  aria-label="Clear Filters"
                >
                  Clear Filters
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <IncidentTable incidents={incidents} isLoading={isLoading} />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-4">
            <span className="text-xs font-mono text-slate-400">
              Page <span className="text-slate-200 font-bold">{page}</span> of{' '}
              <span className="text-slate-200 font-bold">{totalPages}</span> ({total} total items)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                className="font-mono text-xs gap-1 border-slate-700 text-slate-300 disabled:opacity-50"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="font-mono text-xs gap-1 border-slate-700 text-slate-300 disabled:opacity-50"
                aria-label="Next Page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
