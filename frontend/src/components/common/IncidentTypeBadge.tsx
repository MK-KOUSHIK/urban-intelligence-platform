import React from 'react';
import { Badge } from '../ui/Badge';

export const IncidentTypeBadge: React.FC<{ type: string; size?: 'sm' | 'md' }> = ({ type, size = 'md' }) => {
  const formatted = type.replace(/_/g, ' ').toUpperCase();
  return (
    <Badge variant="info" size={size}>
      {formatted}
    </Badge>
  );
};
