import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { SeverityBadge } from './components/common/SeverityBadge';
import { StatusBadge } from './components/common/StatusBadge';

describe('Design System UI Components', () => {
  it('renders Button component with label', () => {
    render(<Button>Submit Command</Button>);
    expect(screen.getByRole('button', { name: /Submit Command/i })).toBeInTheDocument();
  });

  it('renders Badge component', () => {
    render(<Badge variant="danger">High Hazard</Badge>);
    expect(screen.getByText(/High Hazard/i)).toBeInTheDocument();
  });

  it('renders SeverityBadge correctly for high severity', () => {
    render(<SeverityBadge severity="high" />);
    expect(screen.getByText(/High Severity/i)).toBeInTheDocument();
  });

  it('renders StatusBadge correctly for active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
  });
});
