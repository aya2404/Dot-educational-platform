import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft, BsBookHalf, BsPeople, BsPlusSquare } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/common/AppLayout';
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
    if (!selectedCourse) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        const response = await api.get(`/courses/${selectedCourse}/students`);
        setStudents(response.data.data || []);
      } catch {
        setStudents([]);
      }
    };

    fetchStudents();
  }, [selectedCourse]);

  return (
    <AppLayout>
      <div className="app-page" style={{ width: '100%', maxWidth: '100%' }}>
        <section className="page-intro">
          <div>
            <h1 className="page-intro__title">لوحة المدرس</h1>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(getCreateContentPath(user?.role))}
          >
            <BsPlusSquare size={16} />
            إضافة محتوى جديد
          </button>
        </section>

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

        {isLoading ? (
          <div className="surface-card section-state">
            <div className="spinner-border text-primary" role="status" aria-hidden="true" />
          </div>
        ) : null}

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
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student._id}>
                            <td>{student.name}</td>
                            <td>{student.studentId}</td>
                            <td>{student.username}</td>
                            <td>{student.completedLectures}</td>
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
    </AppLayout>
  );
};

export default TeacherDashboard;