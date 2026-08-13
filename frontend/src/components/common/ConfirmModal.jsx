import React, { useEffect } from 'react';
import { BsExclamationTriangle } from 'react-icons/bs';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const ConfirmModal = ({
  open,
  title = 'تأكيد الإجراء',
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  loading,
}) => {
  const dialogRef = useFocusTrap(open);
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="theme-modal-backdrop" onClick={onCancel}>
      <div
        className="theme-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="theme-modal__header">
          <div className="theme-modal__icon">
            <BsExclamationTriangle size={20} />
          </div>
          <div>
            <h2 className="theme-modal__title">{title}</h2>
            {message ? <p className="theme-modal__subtitle">{message}</p> : null}
          </div>
        </div>

        <div className="theme-modal__footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'جاري التنفيذ...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
