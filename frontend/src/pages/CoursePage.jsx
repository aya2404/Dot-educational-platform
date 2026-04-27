import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BsArrowRight,
  BsCheck2Circle,
  BsClockHistory,
  BsPerson,
  BsPlusSquare,
} from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/common/AppLayout';
import Timeline from '../components/student/Timeline';
import api from '../utils/api';
import { getCreateContentPath, getEditContentPath } from '../utils/auth';

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [content, setContent] = useState([]);
  const [completedLectures, setCompletedLectures] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isStudent = user?.role === 'student';
  const canManageContent = ['teacher', 'admin', 'superadmin'].includes(user?.role);

  const fetchCourse = async () => {
    const response = await api.get(`/courses/${courseId}`);
    setCourse(response.data.data);
  };

  const fetchContent = async () => {
    const response = await api.get(`/content/course/${courseId}`);
    setContent(response.data.data || []);
  };

  const fetchProgress = async () => {
    if (!isStudent) return;
    const response = await api.get(`/enrollments/progress/${courseId}`);
    setCompletedLectures(response.data.completedLectures || []);
  };

  const fetchSubmissions = async () => {
    if (!isStudent) return;
    const response = await api.get(`/submissions/status/${courseId}`);
    setSubmissions(response.data.data || {});
  };

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      setError('');
      try {
        await Promise.all([fetchCourse(), fetchContent()]);

        if (isStudent) {
          await Promise.allSettled([fetchProgress(), fetchSubmissions()]);
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'تعذر تحميل بيانات الكورس');
      } finally {
        setIsLoading(false);
      }
    };
    loadPage();
  }, [courseId, isStudent]);

  const handleToggleComplete = async (lectureId) => {
    try {
      const response = await api.post('/enrollments/complete', { courseId, lectureId });
      if (response.data.completed) {
        setCompletedLectures((prev) => [...prev, lectureId]);
      } else {
        setCompletedLectures((prev) => prev.filter((id) => id !== lectureId));
      }
    } catch {
      setError('تعذر تحديث حالة المحاضرة، حاول مرة أخرى.');
    }
  };

  const handleDeleteContent = async (contentId) => {
    await api.delete(`/content/${contentId}`);
    setContent((current) => current.filter((item) => item._id !== contentId));
  };

  return (
    <AppLayout>
      {/* تقليل gap العام للصفحة */}
      <div className="app-page" style={{ gap: '16px' }}>
        <div className="page-toolbar">
          <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>
            <BsArrowRight size={16} />
            العودة
          </button>

          {canManageContent && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`${getCreateContentPath(user?.role)}?courseId=${courseId}`)}
            >
              <BsPlusSquare size={16} />
              إضافة محتوى جديد
            </button>
          )}
        </div>

        {isLoading && (
          <div className="surface-card section-state">
            <div className="spinner-border text-primary" role="status" aria-hidden="true" />
          </div>
        )}

        {!isLoading && error && (
          <div className="surface-card">
            <div className="alert alert-danger mb-0">{error}</div>
          </div>
        )}

        {!isLoading && !error && course && (
          <>
            {/* تصغير padding و margin داخل intro */}
            <section
              className="page-intro page-intro--course"
              style={{ padding: '20px 24px', marginBottom: 0 }}
            >
              <div>
                <p className="page-intro__eyebrow" style={{ marginBottom: '4px' }}>
                  {course.group || 'بدون مجموعة'}
                </p>
                <h1 className="page-intro__title" style={{ marginBottom: '8px' }}>
                  {course.name}
                </h1>
                {/* يمكن إضافة النص الترحيبي إذا كان موجوداً في course.description */}
                {course.description && (
                  <p className="page-intro__subtitle" style={{ marginTop: '4px' }}>
                    {course.description}
                  </p>
                )}
              </div>

              <div className="course-meta" style={{ marginTop: '0', gap: '12px' }}>
                <span>
                  <BsPerson size={14} />
                  {course.teacher?.name || 'بدون مدرس'}
                </span>
                <span>
                  <BsClockHistory size={14} />
                  {course.time || 'الوقت سيحدد لاحقاً'}
                </span>
                {isStudent && (
                  <span>
                    <BsCheck2Circle size={14} />
                    {completedLectures.length} محاضرة مكتملة
                  </span>
                )}
              </div>
            </section>

            <Timeline
              content={content}
              currentUser={user}
              isStudent={isStudent}
              completedLectures={completedLectures}
              submissions={submissions}
              onToggleComplete={handleToggleComplete}
              onRefreshSubmissions={fetchSubmissions}
              onDeleteContent={handleDeleteContent}
              onEditContent={(item) => navigate(getEditContentPath(user?.role, item._id))}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default CoursePage;
