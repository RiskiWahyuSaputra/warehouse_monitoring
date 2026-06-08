import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', variant: 'danger', onConfirm: null });

  const confirm = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, confirmText, cancelText, variant, onConfirm: resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.onConfirm?.(true);
    setState((s) => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    state.onConfirm?.(false);
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog open={state.open} title={state.title} message={state.message} confirmText={state.confirmText} cancelText={state.cancelText} variant={state.variant} onConfirm={handleConfirm} onCancel={handleCancel} />
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
};

function ConfirmDialog({ open, title, message, confirmText, cancelText, variant, onConfirm, onCancel }) {
  if (!open) return null;

  const variants = {
    danger: { icon: 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20', btn: 'btn-danger', border: 'border-red-200 dark:border-red-900' },
    warning: { icon: 'text-yellow-500 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20', btn: 'bg-yellow-600 text-white hover:bg-yellow-700', border: 'border-yellow-200 dark:border-yellow-900' },
    info: { icon: 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', btn: 'btn-primary', border: 'border-blue-200 dark:border-blue-900' },
  };

  const v = variants[variant] || variants.danger;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className={`card w-full max-w-sm border ${v.border}`}>
        <div className="flex items-start gap-3 p-5">
          <div className={`p-2 rounded-xl ${v.icon} flex-shrink-0`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onCancel} className="btn-secondary">{cancelText}</button>
          <button onClick={onConfirm} className={v.btn}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
