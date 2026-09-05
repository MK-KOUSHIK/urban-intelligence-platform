import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

export interface LineChartCardProps {
  title: string;
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  lineColor?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const LineChartCard: React.FC<LineChartCardProps> = ({
  title,
  data,
  xKey,
  yKey,
  lineColor = '#2563eb',
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : isError ? (
          <ErrorState message="Failed to render chart" onRetry={onRetry} />
        ) : data.length === 0 ? (
          <EmptyState title="No Trend Data" description="Telemetry history is currently unavailable." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <RechartsTooltip />
              <Line type="monotone" dataKey={yKey} stroke={lineColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
