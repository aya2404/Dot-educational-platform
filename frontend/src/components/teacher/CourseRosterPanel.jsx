import React, { useCallback, useEffect, useState } from 'react';
import { BsPersonDash, BsPersonPlus } from 'react-icons/bs';
import api from '../../utils/api';
import ConfirmModal from '../common/ConfirmModal';
import Loader from '../common/Loader';

// Reusable single-course roster management for course managers
// (teacher / admin / superadmin). Uses the existing backend contract:
//   GET    /courses/:id/students   — roster (each row carries enrollmentId)
//   POST   /enrollments            — { courseId, identifier }  (studentId code or username)
//   DELETE /enrollments/:id        — unenrol by the roster's enrollmentId
// Authorization is enforced server-side (resolveCourseAccess); this panel is
// only rendered for users who can already manage the course. Rendering it never
// grants access on its own.
const CourseRosterPanel = ({ courseId }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [enrollIdentifier, setEnrollIdentifier] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pendingUnenroll, setPendingUnenroll] = useState(null);
  const [unenrolling, setUnenrolling] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get(`/courses/${courseId}/students`);
      setStudents(response.data.data || []);
    } catch (requestError) {
      setLoadError(requestError.response?.data?.message || 'تعذر تحميل قائمة الطلاب');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleEnroll = async (event) => {
    event.preventDefault();

    if (!enrollIdentifier.trim()) {
      setMessage({ type: 'danger', text: 'أدخل معرّف الطالب أو اسم المستخدم' });
      return;
    }

    setEnrolling(true);
    setMessage({ type: '', text: '' });

    try {
      // Only the backend-supported fields are sent — no owner/role/teacher data.
      await api.post('/enrollments', { courseId, identifier: enrollIdentifier.trim() });
      setEnrollIdentifier('');
      setMessage({ type: 'success', text: 'تم تسجيل الطالب في الكورس' });
      await fetchStudents();
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر تسجيل الطالب' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleConfirmUnenroll = async () => {
    if (!pendingUnenroll) return;

    setUnenrolling(true);
    setMessage({ type: '', text: '' });

    try {
      await api.delete(`/enrollments/${pendingUnenroll.enrollmentId}`);
      setMessage({ type: 'success', text: `تم إلغاء تسجيل ${pendingUnenroll.name}` });
      await fetchStudents();
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر إلغاء التسجيل' });
    } finally {
      setUnenrolling(false);
      setPendingUnenroll(null);
    }
  };

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title">الطلاب</h2>
        </div>
      </div>

      <form className="d-flex gap-2 flex-wrap mb-3" onSubmit={handleEnroll}>
        <input
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="معرّف الطالب (STU-...) أو اسم المستخدم"
          value={enrollIdentifier}
          onChange={(event) => setEnrollIdentifier(event.target.value)}
          disabled={enrolling}
          aria-label="تسجيل طالب في الكورس"
        />
        <button type="submit" className="btn btn-primary" disabled={enrolling}>
          <BsPersonPlus size={16} />
          {enrolling ? 'جاري التسجيل...' : 'تسجيل طالب'}
        </button>
      </form>

      {message.text ? (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      ) : null}

      {loading ? (
        <Loader variant="section" />
      ) : loadError ? (
        <div className="alert alert-danger mb-0">{loadError}</div>
      ) : students.length === 0 ? (
        <div className="empty-panel compact">
          <h3>لا يوجد طلاب مسجلين بعد</h3>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>المعرف</th>
                <th>اسم المستخدم</th>
                <th>المنجز</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td>{student.studentId}</td>
                  <td>{student.username}</td>
                  <td>{student.completedLectures}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setPendingUnenroll(student)}
                      disabled={unenrolling}
                    >
                      <BsPersonDash size={14} />
                      إلغاء التسجيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingUnenroll)}
        title="إلغاء تسجيل الطالب"
        message={
          pendingUnenroll
            ? `سيتم إلغاء تسجيل «${pendingUnenroll.name}» من هذا الكورس.`
            : ''
        }
        confirmText="إلغاء التسجيل"
        cancelText="تراجع"
        loading={unenrolling}
        onCancel={() => !unenrolling && setPendingUnenroll(null)}
        onConfirm={handleConfirmUnenroll}
      />
    </section>
  );
};

export default CourseRosterPanel;
