import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsCalendarWeek, BsClockHistory } from 'react-icons/bs';
import api from '../../utils/api';
import { formatDueDate } from '../../utils/contentTypes';
import './UpcomingDeadlines.css';

// Presentation-only grouping by local calendar day. This does NOT determine
// "overdue" — that comes authoritatively from the server (isPastDeadline). It
// only buckets non-overdue items for display.
const startOfLocalDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const bucketFor = (deadline) => {
  if (deadline.isPastDeadline) return 'overdue';
  const today = startOfLocalDay(new Date());
  const due = startOfLocalDay(new Date(deadline.dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 7) return 'week';
  return 'later';
};

const GROUPS = [
  { key: 'overdue', label: 'متأخرة', tone: 'is-overdue' },
  { key: 'today', label: 'اليوم', tone: 'is-today' },
  { key: 'tomorrow', label: 'غداً', tone: 'is-soon' },
  { key: 'week', label: 'هذا الأسبوع', tone: 'is-week' },
  { key: 'later', label: 'لاحقاً', tone: 'is-later' },
];

const STATUS_LABEL = {
  graded: 'تم التقييم',
  submitted: 'تم التسليم',
  not_submitted: 'لم يُسلّم',
};

const UpcomingDeadlines = () => {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/enrollments/my-deadlines');
        if (active) setDeadlines(response.data.data || []);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل مواعيد التسليم');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const grouped = GROUPS.map((group) => ({
    ...group,
    items: deadlines.filter((d) => bucketFor(d) === group.key),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="surface-card upcoming-deadlines" aria-label="مواعيد التسليم القادمة">
      <div className="section-heading">
        <div className="d-flex align-items-center gap-2">
          <BsCalendarWeek size={18} />
          <h2 className="section-heading__title">مواعيد التسليم القادمة</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="section-state">
          <div className="spinner-border text-primary" role="status" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="alert alert-danger mb-0">{error}</div>
      ) : deadlines.length === 0 ? (
        <div className="empty-panel">
          <h3>لا توجد مواعيد تسليم قادمة</h3>
        </div>
      ) : (
        <div className="deadlines-groups">
          {grouped.map((group) => (
            <div key={group.key} className={`deadlines-group ${group.tone}`}>
              <div className="deadlines-group__label">{group.label}</div>
              <ul className="deadlines-list">
                {group.items.map((item) => (
                  <li key={item.taskId}>
                    <button
                      type="button"
                      className="deadline-item"
                      onClick={() => navigate(`/student/course/${item.courseId}`)}
                    >
                      <div className="deadline-item__main">
                        <span className="deadline-item__title">{item.title}</span>
                        <span className="deadline-item__course">{item.courseName}</span>
                      </div>
                      <div className="deadline-item__meta">
                        <span className="deadline-item__date">
                          <BsClockHistory size={13} /> {formatDueDate(item.dueDate)}
                        </span>
                        <span className={`deadline-item__status status-${item.submissionStatus}`}>
                          {STATUS_LABEL[item.submissionStatus] || STATUS_LABEL.not_submitted}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default UpcomingDeadlines;
