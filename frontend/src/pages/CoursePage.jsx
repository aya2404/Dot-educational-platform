import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BsArrowRight,
  BsCheck2Circle,
  BsClockHistory,
  BsPencilSquare,
  BsPerson,
  BsPlusSquare,
  BsTable,
  BsTrash3,
} from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/common/AppLayout';
import ConfirmModal from '../components/common/ConfirmModal';
import Loader from '../components/common/Loader';
import Timeline from '../components/student/Timeline';
import CourseGradeSummary from '../components/student/CourseGradeSummary';
import CourseFormModal from '../components/teacher/CourseFormModal';
import CourseRosterPanel from '../components/teacher/CourseRosterPanel';
import GradebookModal from '../components/teacher/GradebookModal';
import api from '../utils/api';
import { getCreateContentPath, getEditContentPath, getRoleHomePath } from '../utils/auth';

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [content, setContent] = useState([]);
  const [completedLectures, setCompletedLectures] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [showGradebook, setShowGradebook] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [pendingCourseDelete, setPendingCourseDelete] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [courseActionMsg, setCourseActionMsg] = useState({ type: '', text: '' });
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

  const handleTogglePublish = async (item, nextPublished) => {
    const response = await api.put(`/content/${item._id}`, { isPublished: nextPublished });
    const updated = response.data.data;
    setContent((current) => current.map((entry) => (entry._id === updated._id ? updated : entry)));
  };

  const handleCourseSaved = (updatedCourse) => {
    setCourse(updatedCourse); // reflect edits immediately in the header
    setShowEditCourse(false);
    setCourseActionMsg({ type: 'success', text: 'تم تحديث بيانات الكورس' });
  };

  const handleDeleteCourse = async () => {
    setDeletingCourse(true);
    setCourseActionMsg({ type: '', text: '' });
    try {
      await api.delete(`/courses/${courseId}`);
      navigate(getRoleHomePath(user?.role), { replace: true }); // list refreshes on mount
    } catch (requestError) {
      setCourseActionMsg({ type: 'danger', text: requestError.response?.data?.message || 'تعذر حذف الكورس' });
      setDeletingCourse(false);
      setPendingCourseDelete(false);
    }
  };

  return (
    <AppLayout>
      <div className="app-page" style={{ gap: '16px' }}>
        <div className="page-toolbar">
          <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>
            <BsArrowRight size={16} />
            العودة
          </button>

          {canManageContent && (
            <>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => setShowGradebook(true)}
              >
                <BsTable size={16} />
                دفتر الدرجات
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => setShowEditCourse(true)}
                disabled={!course}
              >
                <BsPencilSquare size={16} />
                تعديل الكورس
              </button>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setPendingCourseDelete(true)}
                disabled={!course || deletingCourse}
              >
                <BsTrash3 size={16} />
                حذف الكورس
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`${getCreateContentPath(user?.role)}?courseId=${courseId}`)}
              >
                <BsPlusSquare size={16} />
                إضافة محتوى جديد
              </button>
            </>
          )}
        </div>

        {courseActionMsg.text ? (
          <div className={`alert alert-${courseActionMsg.type} mb-0`}>{courseActionMsg.text}</div>
        ) : null}

        {isLoading && <Loader variant="section" card />}

        {!isLoading && error && (
          <div className="surface-card">
            <div className="alert alert-danger mb-0">{error}</div>
          </div>
        )}

        {!isLoading && !error && course && (
          <>
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

            {isStudent && <CourseGradeSummary courseId={courseId} />}

            {canManageContent && <CourseRosterPanel courseId={courseId} />}

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
              onTogglePublish={handleTogglePublish}
            />
          </>
        )}
      </div>

      {showGradebook && course && (
        <GradebookModal course={course} onClose={() => setShowGradebook(false)} />
      )}

      <CourseFormModal
        open={showEditCourse && Boolean(course)}
        course={course}
        onClose={() => setShowEditCourse(false)}
        onSaved={handleCourseSaved}
      />

      <ConfirmModal
        open={pendingCourseDelete}
        title="حذف الكورس"
        message={
          course
            ? `سيتم حذف «${course.name}» وجميع محتوياته وتسجيلات الطلاب والتسليمات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.`
            : ''
        }
        confirmText="حذف الكورس"
        cancelText="إلغاء"
        loading={deletingCourse}
        onCancel={() => !deletingCourse && setPendingCourseDelete(false)}
        onConfirm={handleDeleteCourse}
      />
    </AppLayout>
  );
};

export default CoursePage;
