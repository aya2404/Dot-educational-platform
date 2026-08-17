import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BsArrowLeft,
  BsAward,
  BsBarChartLineFill,
  BsBookHalf,
  BsCalendarWeek,
  BsCheck2Circle,
  BsClockHistory,
  BsDownload,
  BsSend,
} from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/common/AppLayout';
import Loader from '../components/common/Loader';
import UpcomingDeadlines from '../components/student/UpcomingDeadlines';
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

// --- Lightweight, dependency-free SVG/CSS charts (no charting library) ---

const ProgressRing = ({ value, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${pct}٪ مكتمل`}>
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--dj-border)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="var(--dj-primary)"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="66" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--dj-primary)">
        {pct}٪
      </text>
    </svg>
  );
};

const GradeBars = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted mb-0">لا توجد درجات بعد</p>;
  }
  return (
    <div className="d-flex align-items-end gap-3" style={{ height: 170 }}>
      {data.map((entry) => (
        <div
          key={entry.course}
          className="d-flex flex-column align-items-center justify-content-end"
          style={{ flex: 1, minWidth: 0, height: '100%' }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{entry.average}٪</span>
          <div
            style={{
              width: '70%',
              maxWidth: 40,
              height: `${Math.max(4, (entry.average / 100) * 120)}px`,
              background: 'var(--dj-primary)',
              borderRadius: '8px 8px 4px 4px',
            }}
          />
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--dj-text-muted)',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.course}
          </span>
        </div>
      ))}
    </div>
  );
};

const ActivityLine = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted mb-0">لا يوجد نشاط</p>;
  }
  const width = 300;
  const height = 130;
  const pad = 22;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = (width - pad * 2) / Math.max(1, data.length - 1);
  const point = (d, i) => {
    const x = pad + i * step;
    const y = height - pad - (d.count / max) * (height - pad * 2);
    return { x, y };
  };
  const polyline = data.map((d, i) => { const { x, y } = point(d, i); return `${x},${y}`; }).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="نشاط التسليمات آخر 7 أيام">
      <polyline
        fill="none"
        stroke="var(--dj-primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polyline}
      />
      {data.map((d, i) => {
        const { x, y } = point(d, i);
        return <circle key={d.date} cx={x} cy={y} r="3.5" fill="var(--dj-primary)" />;
      })}
    </svg>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [certBusyCourse, setCertBusyCourse] = useState('');
  const [certMessage, setCertMessage] = useState({ type: '', text: '' });

  const handleGetCertificate = async (courseId) => {
    setCertBusyCourse(courseId);
    setCertMessage({ type: '', text: '' });
    try {
      // Generate (idempotent) then download the PDF for the caller's own cert.
      const created = await api.post('/certificates', { courseId });
      const certificate = created.data.data;
      const pdf = await api.get(`/certificates/${certificate._id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(pdf.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${certificate.certificateId || 'certificate'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setCertMessage({ type: 'success', text: 'تم تنزيل الشهادة' });
    } catch (requestError) {
      setCertMessage({
        type: 'danger',
        text: requestError.response?.data?.message || 'تعذر إصدار الشهادة',
      });
    } finally {
      setCertBusyCourse('');
    }
  };

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

    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics/student');
        setStats(response.data.data || null);
      } catch {
        setStats(null); // analytics are supplementary — never block the dashboard
      } finally {
        setStatsLoading(false);
      }
    };

    fetchEnrollments();
    fetchStats();
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
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsBarChartLineFill size={18} />
            </span>
            <div>
              <strong>{stats ? `${stats.averageGrade}٪` : '—'}</strong>
              <span>متوسط الدرجات</span>
            </div>
          </article>
          <article className="metric-card">
            <span className="metric-card__icon">
              <BsSend size={18} />
            </span>
            <div>
              <strong>{stats ? stats.submissionsCount : '—'}</strong>
              <span>التسليمات</span>
            </div>
          </article>
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2 className="section-heading__title">التحليلات</h2>
            </div>
          </div>

          {statsLoading ? (
            <Loader variant="section" />
          ) : !stats ? (
            <div className="empty-panel compact">
              <h3>لا تتوفر تحليلات حالياً</h3>
            </div>
          ) : (
            <div className="row g-4">
              <div className="col-12 col-md-4">
                <div className="d-flex flex-column align-items-center gap-2">
                  <ProgressRing value={stats.completedLectures} total={stats.totalLectures} />
                  <span className="text-muted">
                    {stats.completedLectures} / {stats.totalLectures} محاضرة مكتملة
                  </span>
                </div>
              </div>
              <div className="col-12 col-md-8">
                <h3 style={{ fontSize: '0.95rem' }}>الدرجات حسب الكورس</h3>
                <GradeBars data={stats.gradeByCourse} />
              </div>
              <div className="col-12">
                <h3 style={{ fontSize: '0.95rem' }}>نشاط التسليمات (آخر 7 أيام)</h3>
                <ActivityLine data={stats.recentActivity} />
              </div>
            </div>
          )}
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2 className="section-heading__title">شهاداتي</h2>
            </div>
          </div>

          {certMessage.text ? (
            <div className={`alert alert-${certMessage.type}`}>{certMessage.text}</div>
          ) : null}

          {enrollments.length === 0 ? (
            <div className="empty-panel compact">
              <h3>سجّل في كورس واحصل على شهادة عند إتمامه</h3>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {enrollments.map((enrollment) => (
                <div key={enrollment._id} className="stack-list__item static">
                  <div className="d-flex align-items-center gap-2">
                    <BsAward size={18} />
                    <strong>{enrollment.course?.name}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleGetCertificate(enrollment.course?._id)}
                    disabled={certBusyCourse === enrollment.course?._id}
                  >
                    <BsDownload size={14} />
                    {certBusyCourse === enrollment.course?._id ? 'جارٍ الإصدار...' : 'تحميل الشهادة'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <UpcomingDeadlines />

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <h2 className="section-heading__title">كورساتي</h2>
            </div>
          </div>

          {isLoading ? <Loader variant="section" /> : null}

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
