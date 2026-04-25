import React, { useEffect, useState } from 'react';
import { BsCheckCircle, BsSend, BsTrash3, BsXLg } from 'react-icons/bs';
import api from '../../utils/api';
import { normalizeAttachments } from '../../utils/attachments';
import { formatDueDate, isDueDatePassed } from '../../utils/contentTypes';
import ConfirmModal from '../common/ConfirmModal';
import FileUploader from '../common/FileUploader';
import './TaskSubmissionModal.css';

const TaskSubmissionModal = ({ task, existingSubmission, onClose }) => {
  const [answer, setAnswer] = useState(existingSubmission?.answer || '');
  const [attachments, setAttachments] = useState(normalizeAttachments(existingSubmission?.attachments));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const submissionLocked = existingSubmission
    ? !existingSubmission.permissions?.canEdit
    : isDueDatePassed(task?.dueDate);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submissionLocked) {
      setError('انتهى موعد التسليم، ولا يمكن تعديل الإجابة الآن');
      return;
    }

    if (!answer.trim() && attachments.length === 0) {
      setError('أضف إجابة نصية أو ملفاً واحداً على الأقل قبل التسليم');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/submissions', {
        taskId: task._id,
        answer: answer.trim(),
        attachments,
      });

      setSuccess(true);
      window.setTimeout(() => onClose(true), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'حدث خطأ أثناء حفظ التسليم');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSubmission || !existingSubmission.permissions?.canDelete) {
      return;
    }

    setIsLoading(true);
    setShowDeleteConfirm(false);

    try {
      await api.delete(`/submissions/${existingSubmission._id}`);
      onClose(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'حدث خطأ أثناء حذف التسليم');
      setIsLoading(false);
    }
  };

  return (
    <div className="theme-modal-backdrop" onClick={() => onClose(false)}>
      <div className="theme-modal theme-modal--wide" onClick={(event) => event.stopPropagation()}>
        <div className="theme-modal__header">
          <div className="d-flex align-items-start gap-3">
            <div className="theme-modal__icon">
              <BsSend size={18} />
            </div>
            <div>
              <h2 className="theme-modal__title">{task.title}</h2>
            </div>
          </div>

          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onClose(false)}>
            <BsXLg size={14} />
          </button>
        </div>

        {task.body || task.dueDate ? (
          <div className="task-modal__summary">
            {task.body ? <p>{task.body}</p> : null}
            {task.dueDate ? (
              <span>موعد التسليم: {formatDueDate(task.dueDate)}</span>
            ) : null}
          </div>
        ) : null}

        {success ? (
          <div className="task-modal__success">
            <BsCheckCircle size={40} />
            <h3>تم حفظ التسليم بنجاح</h3>
            <p>سيتم تحديث الصفحة خلال لحظات.</p>
          </div>
        ) : (
          <form className="task-modal__form" onSubmit={handleSubmit}>
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {submissionLocked ? (
              <div className="alert alert-secondary mb-0">
                انتهى وقت التسليم. يمكنك مراجعة الإجابة الحالية فقط.
              </div>
            ) : null}

            <div>
              <label className="form-label">الإجابة النصية</label>
              <textarea
                className="form-control"
                rows={6}
                placeholder="اكتب الإجابة"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={isLoading || submissionLocked}
              />
            </div>

            <FileUploader
              value={attachments}
              onChange={setAttachments}
              disabled={isLoading || submissionLocked}
              label="ملفات التسليم"
            />

            <div className="theme-modal__footer">
              <div className="d-flex gap-2">
                {existingSubmission ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading || !existingSubmission.permissions?.canDelete}
                  >
                    <BsTrash3 size={16} />
                    حذف التسليم
                  </button>
                ) : null}
              </div>

              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => onClose(false)} disabled={isLoading}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading || submissionLocked}>
                  <BsSend size={16} />
                  {isLoading ? 'جاري الحفظ...' : existingSubmission ? 'حفظ التعديلات' : 'تسليم المهمة'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="حذف التسليم"
        message="هل تريد حذف التسليم الحالي؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        loading={isLoading}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default TaskSubmissionModal;
