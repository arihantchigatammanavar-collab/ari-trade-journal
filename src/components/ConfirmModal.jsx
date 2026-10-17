import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isDestructive ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Please confirm your action</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
