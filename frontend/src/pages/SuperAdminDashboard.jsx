import React, { useEffect, useState } from 'react';
import {
  BsArrowLeft,
  BsBookHalf,
  BsPeople,
  BsPersonBadge,
  BsPlusSquare,
  BsShieldCheck,
} from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/common/AppLayout';
import ConfirmModal from '../components/common/ConfirmModal';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCreateContentPath, getRoleCoursePath, ROLE_LABELS } from '../utils/auth';

const SuperAdminDashboard = ({ mode = 'superadmin' }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const canManageEnrollments = mode === 'superadmin';
  const availableTabs = canManageEnrollments
    ? [
        { id: 'overview', label: 'نظرة عامة' },
        { id: 'users', label: 'المستخدمون' },
        { id: 'courses', label: 'الكورسات' },
        { id: 'enrollments', label: 'التسجيلات' },
      ]
    : [
        { id: 'overview', label: 'نظرة عامة' },
        { id: 'users', label: 'المستخدمون' },
        { id: 'courses', label: 'الكورسات' },
      ];

  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', role: 'student', password: '' });
  const [createMessage, setCreateMessage] = useState({ type: '', text: '' });
  const [creating, setCreating] = useState(false);
  const [enrollmentForm, setEnrollmentForm] = useState({ studentId: '', courseId: '' });
  const [enrollmentMessage, setEnrollmentMessage] = useState({ type: '', text: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [pendingDeactivation, setPendingDeactivation] = useState(null);

  const currentUserId = currentUser?._id || currentUser?.id;

  const applyActiveState = async (targetUser, nextActive) => {
    setTogglingUserId(targetUser._id);
    setStatusMessage({ type: '', text: '' });
    try {
      const response = await api.put(`/users/${targetUser._id}`, { isActive: nextActive });
      const updated = response.data.data;
      setUsers((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setStatusMessage({
        type: 'success',
        text: nextActive ? `تم تفعيل حساب ${updated.name}` : `تم تعطيل حساب ${updated.name}`,
      });
    } catch (requestError) {
      setStatusMessage({
        type: 'danger',
        text: requestError.response?.data?.message || 'تعذر تحديث حالة الحساب',
      });
    } finally {
      setTogglingUserId('');
    }
  };

  const handleToggleActive = (targetUser) => {
    if (targetUser.isActive) {
      setPendingDeactivation(targetUser); // destructive -> confirm first
    } else {
      applyActiveState(targetUser, true); // activation -> direct
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [usersResponse, coursesResponse] = await Promise.all([
          api.get('/users'),
          api.get('/courses'),
        ]);

        setUsers(usersResponse.data.data || []);
        setCourses(coursesResponse.data.data || []);
      } catch {
        setError('تعذر تحميل بيانات الإدارة');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const teachers = users.filter((user) => user.role === 'teacher');
  const students = users.filter((user) => user.role === 'student');
  const roleOptions = canManageEnrollments
    ? [
        { value: 'student', label: 'طالب' },
        { value: 'teacher', label: 'مدرس' },
        { value: 'admin', label: 'مشرف' },
      ]
    : [
        { value: 'student', label: 'طالب' },
        { value: 'teacher', label: 'مدرس' },
      ];

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (!newUser.name.trim() || !newUser.password.trim()) {
      setCreateMessage({ type: 'danger', text: 'الاسم وكلمة المرور مطلوبان' });
      return;
    }

    setCreating(true);
    setCreateMessage({ type: '', text: '' });

    try {
      const response = await api.post('/users', newUser);
      const createdUser = response.data.data;

      setUsers((currentUsers) => [createdUser, ...currentUsers]);
      setNewUser({ name: '', role: 'student', password: '' });
      setCreateMessage({
        type: 'success',
        text: `تم إنشاء الحساب بنجاح: ${createdUser.username}`,
      });
    } catch (requestError) {
      setCreateMessage({
        type: 'danger',
        text: requestError.response?.data?.message || 'تعذر إنشاء الحساب',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEnrollStudent = async (event) => {
    event.preventDefault();

    if (!enrollmentForm.studentId || !enrollmentForm.courseId) {
      setEnrollmentMessage({ type: 'danger', text: 'اختر الطالب والكورس أولاً' });
      return;
    }

    setEnrolling(true);
    setEnrollmentMessage({ type: '', text: '' });

    try {
      await api.post('/enrollments', enrollmentForm);
      setEnrollmentForm({ studentId: '', courseId: '' });
      setEnrollmentMessage({ type: 'success', text: 'تم تسجيل الطالب بنجاح' });
    } catch (requestError) {
      setEnrollmentMessage({
        type: 'danger',
        text: requestError.response?.data?.message || 'تعذر تنفيذ التسجيل',
      });
    } finally {
      setEnrolling(false);
    }
  };

  const dashboardTitle = canManageEnrollments ? 'لوحة المشرف الرئيسي' : 'لوحة الإدارة';
  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">الإدارة</p>
            <h1 className="page-intro__title">{dashboardTitle}</h1>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(getCreateContentPath(mode))}
          >
            <BsPlusSquare size={16} />
            إضافة محتوى جديد
          </button>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsPeople size={18} />
            </span>
            <div>
              <strong>{users.length}</strong>
              <span>إجمالي المستخدمين</span>
            </div>
          </article>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsShieldCheck size={18} />
            </span>
            <div>
              <strong>{teachers.length}</strong>
              <span>مدرسون</span>
            </div>
          </article>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsPersonBadge size={18} />
            </span>
            <div>
              <strong>{students.length}</strong>
              <span>طلاب</span>
            </div>
          </article>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsBookHalf size={18} />
            </span>
            <div>
              <strong>{courses.length}</strong>
              <span>كورسات</span>
            </div>
          </article>
        </section>

        <div className="tab-strip">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-strip__button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="surface-card section-state">
            <div className="spinner-border text-primary" role="status" aria-hidden="true" />
          </div>
        ) : null}

        {!isLoading && error ? <div className="alert alert-danger">{error}</div> : null}

        {!isLoading && !error && activeTab === 'overview' ? (
          <div className="row g-4">
            <div className="col-12 col-xl-6">
              <section className="surface-card h-100">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">المدرسون</h2>
                  </div>
                </div>
                <div className="stack-list">
                  {teachers.slice(0, 6).map((teacher) => (
                    <div key={teacher._id} className="stack-list__item static">
                      <div>
                        <strong>{teacher.name}</strong>
                        <span>{teacher.studentId}</span>
                      </div>
                      <span>{teacher.username}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="col-12 col-xl-6">
              <section className="surface-card h-100">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">الكورسات</h2>
                  </div>
                </div>
                <div className="stack-list">
                  {courses.slice(0, 6).map((course) => (
                    <div key={course._id} className="stack-list__item static">
                      <div>
                        <strong>{course.name}</strong>
                        <span>{course.group || 'بدون مجموعة'}</span>
                      </div>
                      <span>{course.teacher?.name || 'بدون مدرس'}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && activeTab === 'users' ? (
          <div className="row g-4">
            <div className="col-12 col-xl-4">
              <section className="surface-card h-100">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">إنشاء حساب</h2>
                  </div>
                </div>

                {createMessage.text ? (
                  <div className={`alert alert-${createMessage.type}`}>{createMessage.text}</div>
                ) : null}

                <form className="d-flex flex-column gap-3" onSubmit={handleCreateUser}>
                  <div>
                    <label className="form-label" htmlFor="new-user-name">الاسم الكامل</label>
                    <input
                      id="new-user-name"
                      type="text"
                      className="form-control"
                      value={newUser.name}
                      onChange={(event) =>
                        setNewUser((currentUser) => ({ ...currentUser, name: event.target.value }))
                      }
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-user-role">الدور</label>
                    <select
                      id="new-user-role"
                      className="form-select"
                      value={newUser.role}
                      onChange={(event) =>
                        setNewUser((currentUser) => ({ ...currentUser, role: event.target.value }))
                      }
                      disabled={creating}
                    >
                      {roleOptions.map((roleOption) => (
                        <option key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-user-password">كلمة المرور</label>
                    <input
                      id="new-user-password"
                      type="password"
                      className="form-control"
                      value={newUser.password}
                      onChange={(event) =>
                        setNewUser((currentUser) => ({ ...currentUser, password: event.target.value }))
                      }
                      disabled={creating}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                  </button>
                </form>
              </section>
            </div>

            <div className="col-12 col-xl-8">
              <section className="surface-card h-100">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">كل المستخدمين</h2>
                  </div>
                </div>

                {statusMessage.text ? (
                  <div className={`alert alert-${statusMessage.type} mb-3`}>{statusMessage.text}</div>
                ) : null}

                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>المعرف</th>
                        <th>الدور</th>
                        <th>الحالة</th>
                        <th>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isSelf = currentUserId && String(user._id) === String(currentUserId);
                        const isPending = togglingUserId === user._id;
                        return (
                          <tr key={user._id}>
                            <td>{user.name}</td>
                            <td>{user.studentId}</td>
                            <td>{ROLE_LABELS[user.role] || user.role}</td>
                            <td>
                              <span className={`badge ${user.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                {user.isActive ? 'فعال' : 'معطل'}
                              </span>
                            </td>
                            <td>
                              {isSelf ? (
                                <span className="text-muted small">حسابك الحالي</span>
                              ) : (
                                <button
                                  type="button"
                                  className={`btn btn-sm ${user.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                  onClick={() => handleToggleActive(user)}
                                  disabled={isPending}
                                >
                                  {isPending ? '...' : user.isActive ? 'تعطيل' : 'تفعيل'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && activeTab === 'courses' ? (
          <section className="surface-card">
            <div className="section-heading">
              <div>
                <h2 className="section-heading__title">الكورسات الحالية</h2>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>اسم الكورس</th>
                    <th>المجموعة</th>
                    <th>المدرس</th>
                    <th>الوقت</th>
                    <th>الأيام</th>
                    <th>الإدارة</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course._id}>
                      <td>{course.name}</td>
                      <td>{course.group || '-'}</td>
                      <td>{course.teacher?.name || 'بدون مدرس'}</td>
                      <td>{course.time || '-'}</td>
                      <td>{course.days?.length ? course.days.join(' - ') : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => navigate(getRoleCoursePath(mode, course._id))}
                        >
                          <BsArrowLeft size={14} />
                          إدارة المحتوى
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!isLoading && !error && activeTab === 'enrollments' && canManageEnrollments ? (
          <section className="surface-card" style={{ maxWidth: 520 }}>
            <div className="section-heading">
              <div>
                <h2 className="section-heading__title">تسجيل طالب في كورس</h2>
              </div>
            </div>

            {enrollmentMessage.text ? (
              <div className={`alert alert-${enrollmentMessage.type}`}>{enrollmentMessage.text}</div>
            ) : null}

            <form className="d-flex flex-column gap-3" onSubmit={handleEnrollStudent}>
              <div>
                <label className="form-label" htmlFor="enroll-student">الطالب</label>
                <select
                  id="enroll-student"
                  className="form-select"
                  value={enrollmentForm.studentId}
                  onChange={(event) =>
                    setEnrollmentForm((currentForm) => ({
                      ...currentForm,
                      studentId: event.target.value,
                    }))
                  }
                  disabled={enrolling}
                >
                  <option value="">اختر طالباً</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="enroll-course">الكورس</label>
                <select
                  id="enroll-course"
                  className="form-select"
                  value={enrollmentForm.courseId}
                  onChange={(event) =>
                    setEnrollmentForm((currentForm) => ({
                      ...currentForm,
                      courseId: event.target.value,
                    }))
                  }
                  disabled={enrolling}
                >
                  <option value="">اختر كورساً</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name} - {course.group || 'بدون مجموعة'}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={enrolling}>
                {enrolling ? 'جاري التسجيل...' : 'تسجيل الطالب'}
              </button>
            </form>
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(pendingDeactivation)}
        title="تعطيل الحساب"
        message={
          pendingDeactivation
            ? `سيتم تعطيل حساب "${pendingDeactivation.name}". لن يتمكن من تسجيل الدخول حتى إعادة التفعيل.`
            : ''
        }
        confirmText="تعطيل"
        cancelText="إلغاء"
        loading={Boolean(pendingDeactivation) && togglingUserId === pendingDeactivation._id}
        onCancel={() => {
          if (!togglingUserId) setPendingDeactivation(null);
        }}
        onConfirm={async () => {
          const target = pendingDeactivation;
          await applyActiveState(target, false);
          setPendingDeactivation(null);
        }}
      />
    </AppLayout>
  );
};

export default SuperAdminDashboard;
