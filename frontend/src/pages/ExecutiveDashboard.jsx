import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BsBarChartLineFill,
  BsBookHalf,
  BsMortarboardFill,
  BsPeopleFill,
  BsSend,
} from 'react-icons/bs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppLayout from '../components/common/AppLayout';
import Loader from '../components/common/Loader';
import StatsCard from '../components/common/StatsCard';
import api from '../utils/api';

const PRIMARY = '#203f9a';
const SECONDARY = '#b5507b';

const ChartCard = ({ title, children }) => (
  <section className="surface-card h-100">
    <div className="section-heading">
      <div>
        <h2 className="section-heading__title" style={{ fontSize: '1rem' }}>{title}</h2>
      </div>
    </div>
    <div style={{ width: '100%', height: 260 }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </section>
);

const ExecutiveDashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const load = useCallback(async (initial = false) => {
    if (initial) setIsLoading(true);
    try {
      const response = await api.get('/analytics/executive');
      setData(response.data.data || null);
      setError('');
    } catch (requestError) {
      if (initial) setError(requestError.response?.data?.message || 'تعذر تحميل لوحة المؤشرات');
    } finally {
      if (initial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(false), 60000); // auto-refresh
    return () => clearInterval(pollRef.current);
  }, [load]);

  const users = data?.totalUsers || { students: 0, teachers: 0, admins: 0, total: 0 };
  const submissions = data?.recentActivity?.dailySubmissions || [];
  const growth = data?.userGrowth || [];

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">التحليلات التنفيذية</p>
            <h1 className="page-intro__title">لوحة المؤشرات</h1>
          </div>
        </section>

        {isLoading ? (
          <Loader variant="section" card />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <section className="metric-grid">
              <StatsCard
                icon={<BsPeopleFill size={18} />}
                value={users.total}
                label="إجمالي المستخدمين"
                trend={`${users.students} طالب · ${users.teachers} مدرس`}
              />
              <StatsCard
                icon={<BsBookHalf size={18} />}
                value={data.totalCourses}
                label="الكورسات"
                trend={`${data.activeCourses} نشط`}
              />
              <StatsCard
                icon={<BsSend size={18} />}
                value={data.totalSubmissions}
                label="التسليمات"
                trend={`${data.gradedSubmissions} تم تقييمه`}
              />
              <StatsCard
                icon={<BsBarChartLineFill size={18} />}
                value={`${data.averageGrade}٪`}
                label="متوسط الدرجات"
              />
            </section>

            <div className="row g-4">
              <div className="col-12 col-xl-6">
                <ChartCard title="أعلى 5 كورسات (حسب التسجيل)">
                  <BarChart data={data.topCourses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,63,154,0.1)" />
                    <XAxis dataKey="course" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="students" name="الطلاب" fill={PRIMARY} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>

              <div className="col-12 col-xl-6">
                <ChartCard title="التسليمات اليومية (آخر 7 أيام)">
                  <LineChart data={submissions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,63,154,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="تسليمات" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ChartCard>
              </div>

              <div className="col-12 col-xl-6">
                <ChartCard title="أداء المدرسين (طلاب لكل مدرس)">
                  <BarChart data={data.teacherPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,63,154,0.1)" />
                    <XAxis dataKey="teacher" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="students" name="الطلاب" fill={SECONDARY} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>

              <div className="col-12 col-xl-6">
                <ChartCard title="نمو المستخدمين (آخر 6 أشهر)">
                  <LineChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,63,154,0.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="مستخدمون جدد" stroke={SECONDARY} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ChartCard>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ExecutiveDashboard;
