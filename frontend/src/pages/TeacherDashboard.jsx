import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft, BsBookHalf, BsPeople, BsPersonDash, BsPersonPlus, BsPlusSquare } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/common/AppLayout';
import ConfirmModal from '../components/common/ConfirmModal';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import { getCreateContentPath, getRoleCoursePath } from '../utils/auth';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Create course
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', description: '', group: '', time: '' });
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState({ type: '', text: '' });

  // Enrollment management
  const [enrollIdentifier, setEnrollIdentifier] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState({ type: '', text: '' });
  const [pendingUnenroll, setPendingUnenroll] = useState(null);
  const [unenrolling, setUnenrolling] = useState(false);

  const fetchStudents = async (courseId) => {
    if (!courseId) {
      setStudents([]);
      return;
    }
    try {
      const response = await api.get(`/courses/${courseId}/students`);
      setStudents(response.data.data || []);
    } catch {
      setStudents([]);
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses');
        const nextCourses = response.data.data || [];

        setCourses(nextCourses);
        if (nextCourses.length > 0) {
          setSelectedCourse(nextCourses[0]._id);
        }
      } catch {
        setError('تعذر تحميل الكورسات الحالية');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    fetchStudents(selectedCourse);
    setEnrollMessage({ type: '', text: '' });
    setEnrollIdentifier('');
  }, [selectedCourse]);

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    if (!courseForm.name.trim()) {
      setCreateMessage({ type: 'danger', text: 'اسم الكورس مطلوب' });
      return;
    }
    setCreating(true);
    setCreateMessage({ type: '', text: '' });
    try {
      // Ownership is derived server-side from the authenticated teacher — no
      // owner/teacher field is sent from the client.
      const response = await api.post('/courses', {
        name: courseForm.name.trim(),
        description: courseForm.description.trim(),
        group: courseForm.group.trim(),
        time: courseForm.time.trim(),
      });
      const created = response.data.data;
      setCourses((current) => [created, ...current]);
      setSelectedCourse(created._id);
      setCourseForm({ name: '', description: '', group: '', time: '' });
      setShowCreateForm(false);
      setCreateMessage({ type: 'success', text: `تم إنشاء الكورس «${created.name}»` });
    } catch (requestError) {
      setCreateMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر إنشاء الكورس' });
    } finally {
      setCreating(false);
    }
  };

  const handleEnroll = async (event) => {
    event.preventDefault();
    if (!enrollIdentifier.trim()) {
      setEnrollMessage({ type: 'danger', text: 'أدخل معرّف الطالب أو اسم المستخدم' });
      return;
    }
    setEnrolling(true);
    setEnrollMessage({ type: '', text: '' });
    try {
      await api.post('/enrollments', { courseId: selectedCourse, identifier: enrollIdentifier.trim() });
      setEnrollIdentifier('');
      setEnrollMessage({ type: 'success', text: 'تم تسجيل الطالب في الكورس' });
      await fetchStudents(selectedCourse);
    } catch (requestError) {
      setEnrollMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر تسجيل الطالب' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleConfirmUnenroll = async () => {
    if (!pendingUnenroll) return;
    setUnenrolling(true);
    setEnrollMessage({ type: '', text: '' });
    try {
      await api.delete(`/enrollments/${pendingUnenroll.enrollmentId}`);
      setEnrollMessage({ type: 'success', text: `تم إلغاء تسجيل ${pendingUnenroll.name}` });
      await fetchStudents(selectedCourse);
    } catch (requestError) {
      setEnrollMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر إلغاء التسجيل' });
    } finally {
      setUnenrolling(false);
      setPendingUnenroll(null);
    }
  };

  return (
    <AppLayout>
      <div className="app-page" style={{ width: '100%', maxWidth: '100%' }}>
        <section className="page-intro">
          <div>
            <h1 className="page-intro__title">لوحة المدرس</h1>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setShowCreateForm((current) => !current)}
            >
              <BsBookHalf size={16} />
              إنشاء كورس
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(getCreateContentPath(user?.role))}
            >
              <BsPlusSquare size={16} />
              إضافة محتوى جديد
            </button>
          </div>
        </section>

        {createMessage.text ? (
          <div className={`alert alert-${createMessage.type}`}>{createMessage.text}</div>
        ) : null}

        {showCreateForm ? (
          <section className="surface-card" style={{ maxWidth: 640 }}>
            <div className="section-heading">
              <div>
                <h2 className="section-heading__title">إنشاء كورس جديد</h2>
              </div>
            </div>
            <form className="d-flex flex-column gap-3" onSubmit={handleCreateCourse}>
              <div>
                <label className="form-label" htmlFor="new-course-name">اسم الكورس</label>
                <input
                  id="new-course-name"
                  className="form-control"
                  value={courseForm.name}
                  onChange={(event) => setCourseForm((form) => ({ ...form, name: event.target.value }))}
                  disabled={creating}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="new-course-desc">الوصف (اختياري)</label>
                <textarea
                  id="new-course-desc"
                  className="form-control"
                  rows={2}
                  value={courseForm.description}
                  onChange={(event) => setCourseForm((form) => ({ ...form, description: event.target.value }))}
                  disabled={creating}
                />
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <div className="flex-grow-1">
                  <label className="form-label" htmlFor="new-course-group">المجموعة (اختياري)</label>
                  <input
                    id="new-course-group"
                    className="form-control"
                    value={courseForm.group}
                    onChange={(event) => setCourseForm((form) => ({ ...form, group: event.target.value }))}
                    disabled={creating}
                  />
                </div>
                <div className="flex-grow-1">
                  <label className="form-label" htmlFor="new-course-time">الوقت (اختياري)</label>
                  <input
                    id="new-course-time"
                    className="form-control"
                    value={courseForm.time}
                    onChange={(event) => setCourseForm((form) => ({ ...form, time: event.target.value }))}
                    disabled={creating}
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'جاري الإنشاء...' : 'إنشاء الكورس'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="metric-grid" style={{ width: '100%' }}>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsBookHalf size={18} />
            </span>
            <div>
              <strong>{courses.length}</strong>
              <span>كورسات فعالة</span>
            </div>
          </article>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsPeople size={18} />
            </span>
            <div>
              <strong>{students.length}</strong>
              <span>طلاب في الكورس المحدد</span>
            </div>
          </article>
        </section>

        {isLoading ? <Loader variant="section" card /> : null}

        {!isLoading && error ? <div className="alert alert-danger">{error}</div> : null}

        {!isLoading && !error && courses.length === 0 ? (
          <div className="surface-card">
            <div className="empty-panel">
              <h3>لا توجد كورسات مرتبطة بحسابك حالياً</h3>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && courses.length > 0 ? (
          <div className="row g-4" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
            <div className="col-12 col-xl-5">
              <section className="surface-card h-100">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">كورساتي</h2>
                  </div>
                </div>

                <div className="stack-list">
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      className={`stack-list__item ${selectedCourse === course._id ? 'active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedCourse(course._id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedCourse(course._id);
                        }
                      }}
                    >
                      <div>
                        <strong>{course.name}</strong>
                        <span>{course.group || 'بدون مجموعة'}</span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(getRoleCoursePath(user?.role, course._id));
                        }}
                      >
                        <BsArrowLeft size={14} />
                        عرض الكورس
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="col-12 col-xl-7">
              <section className="surface-card h-100">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">الطلاب</h2>
                  </div>
                </div>

                {selectedCourse ? (
                  <form className="d-flex gap-2 flex-wrap mb-3" onSubmit={handleEnroll}>
                    <input
                      className="form-control"
                      style={{ maxWidth: 320 }}
                      placeholder="معرّف الطالب (STU-...) أو اسم المستخدم"
                      value={enrollIdentifier}
                      onChange={(event) => setEnrollIdentifier(event.target.value)}
                      disabled={enrolling}
                      aria-label="تسجيل طالب"
                    />
                    <button type="submit" className="btn btn-primary" disabled={enrolling}>
                      <BsPersonPlus size={16} />
                      {enrolling ? 'جاري التسجيل...' : 'تسجيل طالب'}
                    </button>
                  </form>
                ) : null}

                {enrollMessage.text ? (
                  <div className={`alert alert-${enrollMessage.type}`}>{enrollMessage.text}</div>
                ) : null}

                {students.length === 0 ? (
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
              </section>
            </div>
          </div>
        ) : null}
      </div>

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
    </AppLayout>
  );
};

export default TeacherDashboard;