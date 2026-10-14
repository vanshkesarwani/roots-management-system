import React, { useEffect, useRef } from 'react';

/**
 * Accessible confirmation modal dialog.
 * Supports Escape key dismissal, focus trap, and customizable variant.
 */
export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'primary'
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus confirm button when dialog opens
      setTimeout(() => confirmBtnRef.current?.focus(), 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !isSubmitting) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h3 id="confirm-dialog-title" className="modal-title">
          {title}
        </h3>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className={`btn ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
