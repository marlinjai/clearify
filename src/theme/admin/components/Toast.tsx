import React, { useState, useCallback, useRef } from 'react';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, show };
}

export function ToastContainer({ toasts }: { toasts: ToastState[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--clearify-radius)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#fff',
            backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626',
            boxShadow: 'var(--clearify-shadow-lg)',
            animation: 'clearify-fade-in 0.2s ease-out',
            maxWidth: '360px',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
