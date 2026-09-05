import React from 'react';
import { Badge } from '../ui/Badge';
import { SeverityLevel } from '../../types';

export const SeverityBadge: React.FC<{ severity: SeverityLevel; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  const map: Record<SeverityLevel, { variant: 'danger' | 'warning' | 'success'; label: string }> = {
    high: { variant: 'danger', label: 'High Severity' },
    medium: { variant: 'warning', label: 'Medium Severity' },
    low: { variant: 'success', label: 'Low Severity' },
  };

  const conf = map[severity.toLowerCase() as SeverityLevel] || { variant: 'success', label: severity };

  return (
    <Badge variant={conf.variant} size={size} dot>
      {conf.label}
    </Badge>
  );
};
