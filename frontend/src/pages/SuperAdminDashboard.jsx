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
import api from '../utils/api';
import { getCreateContentPath, getRoleCoursePath, ROLE_LABELS } from '../utils/auth';

const SuperAdminDashboard = ({ mode = 'superadmin' }) => {
  const navigate = useNavigate();
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
                    <label className="form-label">الاسم الكامل</label>
                    <input
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
                    <label className="form-label">الدور</label>
                    <select
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
                    <label className="form-label">كلمة المرور</label>
                    <input
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

                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>المعرف</th>
                        <th>الدور</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.studentId}</td>
                          <td>{ROLE_LABELS[user.role] || user.role}</td>
                          <td>{user.isActive ? 'فعال' : 'معطل'}</td>
                        </tr>
                      ))}
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
                <label className="form-label">الطالب</label>
                <select
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
                <label className="form-label">الكورس</label>
                <select
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
    </AppLayout>
  );
};

export default SuperAdminDashboard;
