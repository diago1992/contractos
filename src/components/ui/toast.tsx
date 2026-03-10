"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const colors: Record<ToastType, { bg: string; color: string; border: string }> = {
    success: { bg: 'rgba(26,138,90,0.08)', color: 'var(--teal)', border: 'var(--teal)' },
    error: { bg: 'rgba(217,48,37,0.08)', color: 'var(--red)', border: 'var(--red)' },
    info: { bg: 'rgba(26,46,36,0.06)', color: 'var(--text-80)', border: 'var(--text-30)' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 380,
        }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: colors[t.type].bg,
                color: colors[t.type].color,
                borderLeft: `3px solid ${colors[t.type].border}`,
                fontSize: 13,
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                animation: 'slideIn 0.2s ease-out',
              }}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
