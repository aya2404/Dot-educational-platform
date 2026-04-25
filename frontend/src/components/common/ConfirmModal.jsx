import React, { useEffect } from 'react';
import { BsExclamationTriangle } from 'react-icons/bs';

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
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="theme-modal-backdrop" onClick={onCancel}>
      <div className="theme-modal" onClick={(event) => event.stopPropagation()}>
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
