import React, { useEffect, useState } from 'react';
import { BsAward, BsCheckLg, BsXLg } from 'react-icons/bs';
import Loader from './Loader';
import EmptyState from './EmptyState';
import api from '../../utils/api';

// Shared certificate approval queue.
//   role="teacher" → PATCH /certificates/:id/teacher-approve (pending → approved/rejected)
//   role="admin"   → PATCH /certificates/:id/admin-approve   (teacher_approved → issued/rejected)
const ENDPOINT = { teacher: 'teacher-approve', admin: 'admin-approve' };

const CertificateReviewPanel = ({ role = 'teacher' }) => {
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/certificates/pending');
      setItems(response.data.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر تحميل طلبات الشهادات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const review = async (certificate, action) => {
    setBusyId(certificate._id);
    setMessage({ type: '', text: '' });
    try {
      await api.patch(`/certificates/${certificate._id}/${ENDPOINT[role]}`, {
        action,
        feedback: feedback[certificate._id] || '',
      });
      setItems((current) => current.filter((item) => item._id !== certificate._id));
      setMessage({
        type: 'success',
        text: action === 'approve' ? 'تمت الموافقة على الشهادة' : 'تم رفض الشهادة',
      });
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر تنفيذ الإجراء' });
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title">
            <BsAward size={16} className="me-1" style={{ color: 'var(--dj-primary)' }} />
            {role === 'admin' ? 'اعتماد الشهادات' : 'طلبات الشهادات'}
          </h2>
        </div>
      </div>

      {message.text ? <div className={`alert alert-${message.type}`}>{message.text}</div> : null}

      {isLoading ? (
        <Loader variant="section" />
      ) : error ? (
        <div className="alert alert-danger mb-0">{error}</div>
      ) : items.length === 0 ? (
        <EmptyState
          emoji="📜"
          title="لا توجد طلبات بانتظار المراجعة"
          message={role === 'admin' ? 'ستظهر هنا الشهادات بعد موافقة المدرّس.' : 'ستظهر هنا طلبات الطلاب لإصدار الشهادات.'}
        />
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((certificate) => (
            <div key={certificate._id} className="stack-list__item static d-flex flex-column gap-2" style={{ alignItems: 'stretch' }}>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{certificate.student?.name}</strong>
                  <span className="text-muted"> · {certificate.student?.studentId}</span>
                </div>
                <span className="text-muted">{certificate.course?.name}</span>
              </div>

              {role === 'admin' && certificate.teacherReview?.feedback ? (
                <div className="text-muted small">ملاحظة المدرّس: {certificate.teacherReview.feedback}</div>
              ) : null}

              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="ملاحظة (اختياري)"
                value={feedback[certificate._id] || ''}
                onChange={(event) =>
                  setFeedback((current) => ({ ...current, [certificate._id]: event.target.value }))
                }
                disabled={busyId === certificate._id}
              />

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => review(certificate, 'approve')}
                  disabled={busyId === certificate._id}
                >
                  <BsCheckLg size={14} /> موافقة
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => review(certificate, 'reject')}
                  disabled={busyId === certificate._id}
                >
                  <BsXLg size={14} /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default CertificateReviewPanel;
