import React from 'react';
import { Modal } from './Modal.js';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

const buttonBase: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid var(--clearify-border)',
  transition: 'background-color 0.15s, color 0.15s',
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '1.25rem',
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={onClose}
          style={{
            ...buttonBase,
            backgroundColor: 'var(--clearify-bg-secondary)',
            color: 'var(--clearify-text)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={{
            ...buttonBase,
            backgroundColor: danger ? '#dc2626' : 'var(--clearify-primary)',
            color: '#fff',
            border: 'none',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
