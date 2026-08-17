import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';

export const Toast = () => {
  const { toast, closeToast } = useOctopus();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle size={18} color="#EF4444" />;
      case 'info':
        return <Info size={18} color="#00F0FF" />;
      case 'success':
      default:
        return <CheckCircle2 size={18} color="#10B981" />;
    }
  };

  return (
    <div className="hud-toast-container" role="status" aria-live="polite">
      <div className={`hud-toast toast-${toast.type || 'success'}`}>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {getIcon()}
        </div>
        <div
          style={{
            flex: 1,
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.4
          }}
        >
          {toast.message}
        </div>
        <button
          onClick={closeToast}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label="Dismiss message"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
