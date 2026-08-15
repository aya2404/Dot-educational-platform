import React, { useEffect, useState } from 'react';
import { BsBookHalf } from 'react-icons/bs';
import api from '../../utils/api';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// Edit an existing course. Reuses the same fields the teacher create form
// exposes (name / description / group / time) and the backend PUT /courses/:id
// contract. Ownership/role are enforced server-side (resolveCourseAccess); this
// modal only appears for users who could already load the course as managers.
const CourseFormModal = ({ open, course, onClose, onSaved }) => {
  const dialogRef = useFocusTrap(open);
  const [form, setForm] = useState({ name: '', description: '', group: '', time: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Re-seed the form (and clear any transient state) whenever the modal opens.
  // The modal is conditionally rendered via `open` (early-return null) rather
  // than unmounted, so its state persists between opens — reset it here so a
  // fresh open never inherits a stale `saving`/`error` from the previous cycle.
  useEffect(() => {
    if (open && course) {
      setForm({
        name: course.name || '',
        description: course.description || '',
        group: course.group || '',
        time: course.time || '',
      });
      setError('');
      setSaving(false);
    }
  }, [open, course]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, saving, onClose]);

  if (!open) {
    return null;
  }

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('اسم الكورس مطلوب');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Ownership is not transferable here — the `teacher` field is never sent,
      // so a teacher can never reassign the course and the server owner is kept.
      const response = await api.put(`/courses/${course._id}`, {
        name: form.name.trim(),
        description: form.description.trim(),
        group: form.group.trim(),
        time: form.time.trim(),
      });
      setSaving(false);
      onSaved?.(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر حفظ تعديلات الكورس');
      setSaving(false);
    }
  };

  return (
    <div className="theme-modal-backdrop" onClick={() => !saving && onClose?.()}>
      <div
        className="theme-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="تعديل الكورس"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="theme-modal__header">
          <div className="theme-modal__icon">
            <BsBookHalf size={18} />
          </div>
          <div>
            <h2 className="theme-modal__title">تعديل الكورس</h2>
            <p className="theme-modal__subtitle">حدّث بيانات الكورس الأساسية</p>
          </div>
        </div>

        <form className="d-flex flex-column gap-3 mt-3" onSubmit={handleSubmit}>
          {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

          <div>
            <label className="form-label" htmlFor="edit-course-name">اسم الكورس</label>
            <input
              id="edit-course-name"
              className="form-control"
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="edit-course-desc">الوصف (اختياري)</label>
            <textarea
              id="edit-course-desc"
              className="form-control"
              rows={2}
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="d-flex gap-3 flex-wrap">
            <div className="flex-grow-1">
              <label className="form-label" htmlFor="edit-course-group">المجموعة (اختياري)</label>
              <input
                id="edit-course-group"
                className="form-control"
                value={form.group}
                onChange={(event) => handleChange('group', event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex-grow-1">
              <label className="form-label" htmlFor="edit-course-time">الوقت (اختياري)</label>
              <input
                id="edit-course-time"
                className="form-control"
                value={form.time}
                onChange={(event) => handleChange('time', event.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="theme-modal__footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => onClose?.()}
              disabled={saving}
            >
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseFormModal;
