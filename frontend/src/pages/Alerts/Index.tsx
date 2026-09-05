import React, { useState, useEffect, useCallback } from 'react';
import { alertsApi, AlertFilterParams } from '../../api/alerts';
import { Alert } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { AlertFilters } from '../../components/alerts/AlertFilters';
import { AlertTable } from '../../components/alerts/AlertTable';
import { AlertResolveConfirmModal } from '../../components/alerts/AlertResolveConfirmModal';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { RefreshCw, Bell, AlertOctagon, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getErrorMessage } from '../../utils/formatters';

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [filters, setFilters] = useState<AlertFilterParams>({ page: 1, pageSize: 20 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const [resolveTargetId, setResolveTargetId] = useState<string | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);

  // Derived counts from current items / summary
  const unreadCount = alerts.filter((a) => a.status === 'unread').length;
  const ackCount = alerts.filter((a) => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setMutationError(null);
    try {
      const res = await alertsApi.getAlerts({ ...filters, page, pageSize });
      setAlerts(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || Math.ceil((res.total || 0) / pageSize) || 1);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleApplyFilters = (newFilters: AlertFilterParams) => {
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

  // Direct Acknowledge Mutation (Low risk)
  const handleAcknowledge = async (alertId: string) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      await alertsApi.updateAlert(alertId, 'acknowledged');
      await fetchAlerts();
    } catch (err: any) {
      console.error('Alert acknowledge mutation failed:', err);
      handleMutationError(err);
    } finally {
      setIsMutating(false);
    }
  };

  // Resolve Modal Trigger
  const handleOpenResolveModal = (alertId: string) => {
    setResolveTargetId(alertId);
    setIsResolveModalOpen(true);
  };

  // Confirm Resolve Mutation
  const handleConfirmResolve = async () => {
    if (!resolveTargetId) return;
    setIsMutating(true);
    setMutationError(null);
    try {
      await alertsApi.updateAlert(resolveTargetId, 'resolved');
      setIsResolveModalOpen(false);
      setResolveTargetId(null);
      await fetchAlerts();
    } catch (err: any) {
      console.error('Alert resolve mutation failed:', err);
      handleMutationError(err);
    } finally {
      setIsMutating(false);
    }
  };

  const handleMutationError = (err: any) => {
    const status = err.response?.status;
    if (status === 401) {
      setMutationError('Your session has expired. Please sign in again.');
    } else if (status === 403) {
      setMutationError("You don't have permission to modify alerts.");
    } else if (status === 404) {
      setMutationError('Alert not found.');
    } else if (status === 409) {
      setMutationError('This alert status change is no longer valid.');
    } else if (status === 422) {
      setMutationError('Please check the alert update data.');
    } else {
      setMutationError('Unable to update alert. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            Alert Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Monitor and acknowledge operational alerts across the network.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionStatus showWebSocket={true} />

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            disabled={isLoading}
            className="gap-1.5 font-mono text-xs border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
            aria-label="Refresh Alerts"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Mutation Error Notification */}
      {mutationError && (
        <div className="rounded bg-red-500/10 border border-red-500/30 p-3 text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{mutationError}</span>
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
              Total Alerts
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
              {total}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-red-400">Unread</span>
              <Bell className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-red-400 tracking-tight">
              {unreadCount}
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
      <AlertFilters
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      {isError ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <ErrorState
              title="Unable to load alert data."
              message="Could not connect to the alert service."
              onRetry={fetchAlerts}
            />
          </CardContent>
        </Card>
      ) : !isLoading && alerts.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-12">
            <EmptyState
              title="No alerts match the selected filters."
              description="Adjust search parameters, clear filters, or reload the alert center."
              icon={<Bell className="h-10 w-10 text-slate-400" />}
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
          <AlertTable
            alerts={alerts}
            isAdmin={isAdmin}
            onAcknowledge={handleAcknowledge}
            onResolveClick={handleOpenResolveModal}
            isLoading={isLoading}
            isMutating={isMutating}
          />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-4">
            <span className="text-xs font-mono text-slate-400">
              Page <span className="text-slate-200 font-bold">{page}</span> of{' '}
              <span className="text-slate-200 font-bold">{totalPages}</span> ({total} total alerts)
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

      {/* Resolution Confirmation Modal */}
      <AlertResolveConfirmModal
        isOpen={isResolveModalOpen}
        alertId={resolveTargetId || ''}
        onConfirm={handleConfirmResolve}
        onCancel={() => {
          setIsResolveModalOpen(false);
          setResolveTargetId(null);
        }}
        isSubmitting={isMutating}
      />
    </div>
  );
};
