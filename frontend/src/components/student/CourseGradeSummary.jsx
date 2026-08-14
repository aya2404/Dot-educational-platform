import React, { useEffect, useState } from 'react';
import { BsBarChartLineFill } from 'react-icons/bs';
import api from '../../utils/api';
import './CourseGradeSummary.css';

const formatPercentage = (value) =>
  value === null || value === undefined ? '—' : `${value}%`;

// Compact per-course grade summary for the enrolled student. Task-level feedback
// still lives in the Timeline; this card only adds the aggregate + status glance.
const CourseGradeSummary = ({ courseId }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/courses/${courseId}/my-gradebook`);
        if (active) setData(response.data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل ملخص الدرجات');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [courseId]);

  if (isLoading) {
    return (
      <section className="surface-card grade-summary" aria-label="ملخص الدرجات">
        <div className="section-state">
          <div className="spinner-border text-primary" role="status" aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="surface-card grade-summary" aria-label="ملخص الدرجات">
        <div className="alert alert-danger mb-0">{error}</div>
      </section>
    );
  }

  if (!data) return null;

  const gradedCount = data.tasks.filter((task) => task.status === 'graded').length;

  return (
    <section className="surface-card grade-summary" aria-label="ملخص الدرجات">
      <div className="grade-summary__head">
        <BsBarChartLineFill size={18} />
        <h2 className="grade-summary__title">ملخص الدرجات</h2>
      </div>

      <div className="grade-summary__metrics">
        <div className="grade-summary__metric">
          <span className="grade-summary__num grade-summary__num--pct">{formatPercentage(data.percentage)}</span>
          <span className="grade-summary__label">النسبة</span>
        </div>
        <div className="grade-summary__metric">
          <span className="grade-summary__num">{data.earnedPoints}</span>
          <span className="grade-summary__label">النقاط المكتسبة</span>
        </div>
        <div className="grade-summary__metric">
          <span className="grade-summary__num">{data.possiblePoints}</span>
          <span className="grade-summary__label">النقاط الكلية</span>
        </div>
        <div className="grade-summary__metric">
          <span className="grade-summary__num">{gradedCount}/{data.tasks.length}</span>
          <span className="grade-summary__label">مهام مقيّمة</span>
        </div>
      </div>

      {data.tasks.length === 0 ? (
        <p className="grade-summary__empty">لا توجد مهام قابلة للتقييم في هذا الكورس بعد.</p>
      ) : (
        <ul className="grade-summary__tasks">
          {data.tasks.map((task) => (
            <li key={task.taskId} className="grade-summary__task">
              <span className="grade-summary__task-title">{task.title}</span>
              {task.status === 'graded' ? (
                <span className="grade-summary__task-grade">
                  {task.grade}/{task.maxScore}
                </span>
              ) : task.status === 'ungraded' ? (
                <span className="grade-summary__badge is-ungraded">قيد التقييم</span>
              ) : (
                <span className="grade-summary__badge is-missing">لم يُسلّم</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CourseGradeSummary;
