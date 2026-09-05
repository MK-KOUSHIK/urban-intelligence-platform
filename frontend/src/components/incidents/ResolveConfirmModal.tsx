import React from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle, X } from 'lucide-react';

interface ResolveConfirmModalProps {
  isOpen: boolean;
  incidentId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ResolveConfirmModal: React.FC<ResolveConfirmModalProps> = ({
  isOpen,
  incidentId,
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
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2.5 border border-emerald-500/30">
              <AlertTriangle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold font-mono text-white">
                Resolve this incident?
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Incident ID: <span className="text-slate-200">{incidentId}</span>
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

        <p className="text-xs text-slate-300">
          Resolving this incident marks it as fully addressed. This action will broadcast a status transition update across municipal command channels.
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
            aria-label="Confirm Resolve Incident"
          >
            {isSubmitting ? 'Resolving...' : 'Resolve Incident'}
          </Button>
        </div>
      </div>
    </div>
  );
};
