// Small reusable confirmation modal - used wherever an action needs an
// "are you sure" step before something irreversible happens.

'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-xs rounded-xl bg-gray-900 p-5 text-white">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-gray-400">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg bg-gray-800 px-4 py-2 text-sm">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-900 px-4 py-2 text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}