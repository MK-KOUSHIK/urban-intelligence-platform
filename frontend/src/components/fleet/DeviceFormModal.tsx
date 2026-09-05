import React, { useState, useEffect } from 'react';
import { Device, Bus } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    deviceIdentifier: string;
    name: string;
    deviceType: string;
    busId?: string | null;
    isActive: boolean;
  }) => Promise<void>;
  device?: Device | null;
  buses: Bus[];
  isLoading?: boolean;
  error?: string | null;
}

export const DeviceFormModal: React.FC<DeviceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  device,
  buses,
  isLoading = false,
  error = null,
}) => {
  const [deviceIdentifier, setDeviceIdentifier] = useState('');
  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState('bus_camera');
  const [busId, setBusId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (device) {
      setDeviceIdentifier(device.deviceIdentifier || '');
      setName(device.name || '');
      setDeviceType(device.deviceType || 'bus_camera');
      setBusId(device.busId || '');
      setIsActive(device.isActive ?? true);
    } else {
      setDeviceIdentifier('');
      setName('');
      setDeviceType('bus_camera');
      setBusId('');
      setIsActive(true);
    }
    setValidationError(null);
  }, [device, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceIdentifier.trim() || !name.trim() || !deviceType.trim()) {
      setValidationError('Device Identifier, Name, and Device Type are required.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      deviceIdentifier: deviceIdentifier.trim(),
      name: name.trim(),
      deviceType: deviceType.trim(),
      busId: busId.trim() ? busId.trim() : null,
      isActive,
    });
  };

  const displayError = validationError || error;

  const busOptions = [
    { value: '', label: 'Unassigned' },
    ...buses.map((b) => ({
      value: b.id,
      label: `Bus ${b.busNumber} (${b.registrationNumber})`,
    })),
  ];

  const deviceTypeOptions = [
    { value: 'bus_camera', label: 'bus_camera' },
    { value: 'edge_ai_gateway', label: 'edge_ai_gateway' },
    { value: 'passenger_counter', label: 'passenger_counter' },
    { value: 'traffic_sensor', label: 'traffic_sensor' },
    { value: 'gps_tracker', label: 'gps_tracker' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={device ? 'Edit Sensing Device' : 'Create Sensing Device'}
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
              Device Identifier *
            </label>
            <Input
              value={deviceIdentifier}
              onChange={(e) => setDeviceIdentifier(e.target.value)}
              placeholder="e.g. BUS-CAM-001"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Device Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front AI Dashcam"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Device Type *
            </label>
            <Select
              options={deviceTypeOptions}
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Assigned Bus
            </label>
            <Select
              options={busOptions}
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="deviceIsActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
            disabled={isLoading}
          />
          <label htmlFor="deviceIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Device Active
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {device ? 'Save Changes' : 'Create Device'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
