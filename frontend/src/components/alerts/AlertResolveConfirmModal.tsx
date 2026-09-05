import React from 'react';
import { Button } from '../ui/Button';
import { Bell, X } from 'lucide-react';

interface AlertResolveConfirmModalProps {
  isOpen: boolean;
  alertId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const AlertResolveConfirmModal: React.FC<AlertResolveConfirmModalProps> = ({
  isOpen,
  alertId,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2.5 border border-emerald-500/30">
              <Bell className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 id="alert-modal-title" className="text-base font-bold font-mono text-white">
                Resolve this alert?
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Alert ID: <span className="text-slate-200">{alertId}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 font-mono">
          Resolving this alert updates its status to RESOLVED across municipal dispatch channels.
        </p>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="font-mono text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            aria-label="Cancel"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            aria-label="Confirm Resolve Alert"
          >
            {isSubmitting ? 'Resolving...' : 'Confirm Resolve'}
          </Button>
        </div>
      </div>
    </div>
  );
};
