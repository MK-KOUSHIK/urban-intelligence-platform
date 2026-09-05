import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

export interface DonutChartCardProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const DEFAULT_COLORS = ['#dc2626', '#d97706', '#16a34a', '#2563eb', '#64748b'];

export const DonutChartCard: React.FC<DonutChartCardProps> = ({
  title,
  data,
  colors = DEFAULT_COLORS,
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
          <EmptyState title="No Breakdown Data" description="Share distribution is unavailable." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
