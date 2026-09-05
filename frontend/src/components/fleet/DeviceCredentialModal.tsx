import React, { useState } from 'react';
import { DeviceCredentialResponse } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ShieldAlert, Copy, Check, Key } from 'lucide-react';

interface DeviceCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: DeviceCredentialResponse | null;
}

export const DeviceCredentialModal: React.FC<DeviceCredentialModalProps> = ({
  isOpen,
  onClose,
  credential,
}) => {
  const [copied, setCopied] = useState(false);

  if (!credential) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credential.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = credential.apiKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generated Device API Key"
      size="md"
    >
      <div className="space-y-4">
        {/* Prominent Warning Banner */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">
            This device key will not be shown again. Copy it now and store it securely.
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Device Identifier
          </div>
          <div className="font-mono text-sm text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">
            {credential.deviceId}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Key className="h-3.5 w-3.5" /> Plaintext API Key
            </span>
            <span className="text-amber-500 font-normal">One-time display</span>
          </div>
          <div className="relative font-mono text-sm text-emerald-600 dark:text-emerald-400 bg-slate-900 dark:bg-slate-950 p-3 rounded border border-slate-800 break-all select-all">
            {credential.apiKey}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" /> Copied Key!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy API Key
              </>
            )}
          </Button>

          <Button type="button" variant="primary" onClick={onClose}>
            Done & Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
