import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BsArrowLeft,
  BsBookHalf,
  BsCalendarWeek,
  BsCheck2Circle,
  BsClockHistory,
} from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/common/AppLayout';
import api from '../utils/api';

const DAY_AR = {
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const response = await api.get('/enrollments/my');
        setEnrollments(response.data.data || []);
      } catch {
        setError('تعذر تحميل الكورسات الحالية');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  const totalCompletedLectures = enrollments.reduce(
    (sum, enrollment) => sum + (enrollment.completedLectures?.length || 0),
    0
  );

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <h1 className="page-intro__title">لوحة الطالب</h1>
          </div>
          <div className="info-chip">
            <span>المعرف</span>
            <strong>{user?.studentId}</strong>
          </div>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsBookHalf size={18} />
            </span>
            <div>
              <strong>{enrollments.length}</strong>
              <span>كورسات مسجلة</span>
            </div>
          </article>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsCheck2Circle size={18} />
            </span>
            <div>
              <strong>{totalCompletedLectures}</strong>
              <span>محاضرات مكتملة</span>
            </div>
          </article>
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2 className="section-heading__title">كورساتي</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="section-state">
              <div className="spinner-border text-primary" role="status" aria-hidden="true" />
            </div>
          ) : null}

          {!isLoading && error ? <div className="alert alert-danger mb-0">{error}</div> : null}

          {!isLoading && !error && enrollments.length === 0 ? (
            <div className="empty-panel">
              <h3>لا توجد كورسات مسجلة حالياً</h3>
            </div>
          ) : null}

          {!isLoading && !error && enrollments.length > 0 ? (
            <div className="course-grid">
              {enrollments.map((enrollment) => {
                const course = enrollment.course;

                return (
                  <button
                    key={enrollment._id}
                    type="button"
                    className="course-tile text-start"
                    onClick={() => navigate(`/student/course/${course._id}`)}
                  >
                    <div className="course-tile__header">
                      <div>
                        <h3>{course.name}</h3>
                        <p>{course.group || 'بدون مجموعة'}</p>
                      </div>
                      <BsArrowLeft size={18} />
                    </div>

                    <div className="course-tile__meta">
                      <span>
                        <BsClockHistory size={14} />
                        {course.time || 'الوقت سيحدد لاحقاً'}
                      </span>
                      <span>
                        <BsCalendarWeek size={14} />
                        {course.days?.length
                          ? course.days.map((day) => DAY_AR[day] || day).join(' - ')
                          : 'الأيام غير محددة'}
                      </span>
                    </div>

                    <div className="course-tile__footer">
                      <span>المدرس: {course.teacher?.name || 'غير محدد'}</span>
                      <strong>المكتمل: {enrollment.completedLectures?.length || 0}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
