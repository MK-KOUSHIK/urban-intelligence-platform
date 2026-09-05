import React, { useState, useEffect } from 'react';
import { Bus, Route } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface BusFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    busNumber: string;
    registrationNumber: string;
    operator: string;
    routeId?: string | null;
    isActive: boolean;
  }) => Promise<void>;
  bus?: Bus | null;
  routes: Route[];
  isLoading?: boolean;
  error?: string | null;
}

export const BusFormModal: React.FC<BusFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bus,
  routes,
  isLoading = false,
  error = null,
}) => {
  const [busNumber, setBusNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [routeId, setRouteId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (bus) {
      setBusNumber(bus.busNumber || '');
      setRegistrationNumber(bus.registrationNumber || '');
      setOperator(bus.operator || '');
      setRouteId(bus.routeId || '');
      setIsActive(bus.isActive ?? true);
    } else {
      setBusNumber('');
      setRegistrationNumber('');
      setOperator('');
      setRouteId('');
      setIsActive(true);
    }
    setValidationError(null);
  }, [bus, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busNumber.trim() || !registrationNumber.trim() || !operator.trim()) {
      setValidationError('Bus Number, Registration Number, and Operator are required.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      busNumber: busNumber.trim(),
      registrationNumber: registrationNumber.trim(),
      operator: operator.trim(),
      routeId: routeId.trim() ? routeId.trim() : null,
      isActive,
    });
  };

  const displayError = validationError || error;

  const routeOptions = [
    { value: '', label: 'Unassigned' },
    ...routes.map((r) => ({
      value: r.id,
      label: `Route ${r.routeNumber} — ${r.name}`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bus ? 'Edit Bus' : 'Create Bus'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {displayError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bus Number *
            </label>
            <Input
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="e.g. BUS-101"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Registration Number *
            </label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. KA-01-F-1234"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Operator *
          </label>
          <Input
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="e.g. BMTC Metro Express"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Assigned Route
          </label>
          <Select
            options={routeOptions}
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="busIsActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
            disabled={isLoading}
          />
          <label htmlFor="busIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Bus Active
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {bus ? 'Save Changes' : 'Create Bus'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
