import React, { useEffect, useState } from 'react';
import { BsCheckCircle, BsClipboardCheck, BsXLg } from 'react-icons/bs';
import api from '../../utils/api';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import AttachmentList from '../common/AttachmentList';
import Loader from '../common/Loader';
import { formatDueDate } from '../../utils/contentTypes';
import './SubmissionsReviewModal.css';

// A single student's submission with an inline grade/feedback editor.
const SubmissionReviewRow = ({ submission, maxScore, onGraded }) => {
  const [grade, setGrade] = useState(
    submission.grade === null || typeof submission.grade === 'undefined' ? '' : String(submission.grade)
  );
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const canGrade = submission.permissions?.canGrade !== false;
  const student = submission.student || {};

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (grade === '') {
      setError('أدخل الدرجة');
      return;
    }

    const numericGrade = Number(grade);
    if (Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > maxScore) {
      setError(`الدرجة يجب أن تكون بين 0 و ${maxScore}`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch(`/submissions/${submission._id}/grade`, {
        grade: numericGrade,
        feedback: feedback.trim(),
      });
      setSaved(true);
      onGraded?.(response.data.data);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر حفظ التقييم');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className="submission-review__row">
      <div className="submission-review__row-head">
        <div>
          <span className="submission-review__student">{student.name || 'طالب'}</span>
          {student.studentId ? (
            <span className="submission-review__student-id">{student.studentId}</span>
          ) : null}
        </div>
        <div className="d-flex align-items-center gap-2">
          {submission.isLate ? (
            <span className="submission-review__badge is-late">متأخر</span>
          ) : null}
          <span
            className={`submission-review__badge ${
              submission.status === 'graded' ? 'is-graded' : 'is-submitted'
            }`}
          >
            {submission.status === 'graded' ? 'تم التقييم' : 'بانتظار التقييم'}
          </span>
        </div>
      </div>

      {submission.answer ? <p className="submission-review__answer">{submission.answer}</p> : null}

      {submission.attachments?.length ? (
        <AttachmentList attachments={submission.attachments} compact />
      ) : null}

      <div className="submission-review__grade-row">
        <label className="submission-review__grade-field">
          <span>الدرجة (من {maxScore})</span>
          <input
            type="number"
            className="form-control"
            min={0}
            max={maxScore}
            step="any"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            disabled={!canGrade || isSaving}
          />
        </label>

        <label className="submission-review__feedback-field">
          <span>ملاحظات للطالب (اختياري)</span>
          <textarea
            className="form-control"
            rows={2}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            disabled={!canGrade || isSaving}
          />
        </label>
      </div>

      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

      <div className="submission-review__row-actions">
        {saved ? (
          <span className="submission-review__saved">
            <BsCheckCircle size={15} /> تم الحفظ
          </span>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!canGrade || isSaving}
        >
          {isSaving ? 'جاري الحفظ...' : submission.status === 'graded' ? 'تحديث التقييم' : 'حفظ التقييم'}
        </button>
      </div>
    </li>
  );
};

const SubmissionsReviewModal = ({ task, onClose }) => {
  const dialogRef = useFocusTrap(true);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const maxScore = typeof task.maxScore === 'number' ? task.maxScore : 100;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const loadSubmissions = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/submissions/task/${task._id}`);
        if (active) setSubmissions(response.data.data || []);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل التسليمات');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadSubmissions();
    return () => {
      active = false;
    };
  }, [task._id]);

  const handleGraded = (updated) => {
    setSubmissions((current) =>
      current.map((item) => (item._id === updated._id ? updated : item))
    );
  };

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div className="theme-modal-backdrop" onClick={onClose}>
      <div
        className="theme-modal theme-modal--wide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`تسليمات: ${task.title}`}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="theme-modal__header">
          <div className="d-flex align-items-start gap-3">
            <div className="theme-modal__icon">
              <BsClipboardCheck size={18} />
            </div>
            <div>
              <h2 className="theme-modal__title">{task.title}</h2>
              <p className="submission-review__subtitle">
                {task.dueDate ? `موعد التسليم: ${formatDueDate(task.dueDate)}` : 'مراجعة التسليمات وتقييمها'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <BsXLg size={14} />
          </button>
        </div>

        <div className="submission-review__body">
          {isLoading ? (
            <Loader variant="section" />
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : submissions.length === 0 ? (
            <div className="empty-panel">
              <h3>لا توجد تسليمات لهذه المهمة بعد</h3>
            </div>
          ) : (
            <>
              <div className="submission-review__summary">
                {submissions.length} تسليم · {gradedCount} تم تقييمه
              </div>
              <ul className="submission-review__list">
                {submissions.map((submission) => (
                  <SubmissionReviewRow
                    key={submission._id}
                    submission={submission}
                    maxScore={maxScore}
                    onGraded={handleGraded}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionsReviewModal;
