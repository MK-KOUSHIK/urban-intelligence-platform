import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { ErrorState } from '../../components/ui/ErrorState';
import { RecordingTable } from '../../components/recordings/RecordingTable';
import { RecordingFilters } from '../../components/recordings/RecordingFilters';
import { recordingsApi, RecordingFilterParams } from '../../api/recordings';
import { Recording } from '../../types';
import { RefreshCw } from 'lucide-react';

export const RecordingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState<{
    deviceId?: string;
    busId?: string;
    status?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: RecordingFilterParams = {
        page,
        pageSize,
        ...filters,
      };
      const response = await recordingsApi.getRecordings(params);
      setRecordings(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load recordings:', err);
      setError('Unable to load recording data.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleApplyFilters = (newFilters: { deviceId?: string; busId?: string; status?: string }) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recording Evidence"
          description="Review sensing recordings and their associated incident evidence."
          actions={
            <div className="flex items-center gap-3">
              <ConnectionStatus showWebSocket={true} />
              <Button variant="outline" size="sm" onClick={fetchRecordings} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          }
        />
        <ErrorState
          title="Unable to load recording data."
          description="Check your connection or session credentials."
          onRetry={fetchRecordings}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Recording Evidence"
        description="Review sensing recordings and their associated incident evidence."
        actions={
          <div className="flex items-center gap-3">
            <ConnectionStatus showWebSocket={true} />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecordings}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Backend Filters Toolbar */}
      <RecordingFilters
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Main Table Card */}
      <Card>
        <CardContent className="p-0">
          <RecordingTable
            recordings={recordings}
            isLoading={isLoading}
            onView={(rec) => navigate(`/recordings/${rec.id}`)}
          />
        </CardContent>

        {/* Server-Side Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Showing {recordings.length} of {total} recordings
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
