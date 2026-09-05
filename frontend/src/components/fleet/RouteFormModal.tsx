import React, { useState, useEffect } from 'react';
import { Route } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface RouteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    routeNumber: string;
    name: string;
    origin: string;
    destination: string;
    isActive: boolean;
  }) => Promise<void>;
  route?: Route | null;
  isLoading?: boolean;
  error?: string | null;
}

export const RouteFormModal: React.FC<RouteFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  route,
  isLoading = false,
  error = null,
}) => {
  const [routeNumber, setRouteNumber] = useState('');
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (route) {
      setRouteNumber(route.routeNumber || '');
      setName(route.name || '');
      setOrigin(route.origin || '');
      setDestination(route.destination || '');
      setIsActive(route.isActive ?? true);
    } else {
      setRouteNumber('');
      setName('');
      setOrigin('');
      setDestination('');
      setIsActive(true);
    }
    setValidationError(null);
  }, [route, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeNumber.trim() || !name.trim() || !origin.trim() || !destination.trim()) {
      setValidationError('All fields (Route Number, Name, Origin, Destination) are required.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      routeNumber: routeNumber.trim(),
      name: name.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      isActive,
    });
  };

  const displayError = validationError || error;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={route ? 'Edit Route' : 'Create Route'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {displayError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Route Number *
          </label>
          <Input
            value={routeNumber}
            onChange={(e) => setRouteNumber(e.target.value)}
            placeholder="e.g. 201"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Route Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Central City Loop"
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Origin *
            </label>
            <Input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Main Station"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination *
            </label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. North Terminal"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="routeIsActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
            disabled={isLoading}
          />
          <label htmlFor="routeIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Route Active
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {route ? 'Save Changes' : 'Create Route'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
