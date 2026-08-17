import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/common/AppLayout';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './StudentCalendar.css';

const localizer = momentLocalizer(moment);

// Arabic toolbar / label strings for react-big-calendar's chrome.
const MESSAGES = {
  date: 'التاريخ',
  time: 'الوقت',
  event: 'الحدث',
  allDay: 'طوال اليوم',
  week: 'أسبوع',
  work_week: 'أيام العمل',
  day: 'يوم',
  month: 'شهر',
  previous: 'السابق',
  next: 'التالي',
  yesterday: 'أمس',
  tomorrow: 'غداً',
  today: 'اليوم',
  agenda: 'جدول',
  noEventsInRange: 'لا توجد أحداث في هذه الفترة.',
  showMore: (total) => `+ ${total} المزيد`,
};

// Each event type maps to a themed colour (purple primary is dominant).
const TYPE_COLOR = {
  task: 'var(--dj-primary)',
  lecture: 'var(--dj-secondary)',
  submission: 'var(--dj-success)',
};

const TYPE_LABEL = {
  task: 'مهمة',
  lecture: 'محاضرة',
  submission: 'تسليم',
};

const StudentCalendar = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get('/calendar/events');
        if (!active) return;
        const mapped = (response.data.data || [])
          .filter((item) => item.date)
          .map((item) => {
            const start = new Date(item.date);
            return {
              id: item.id,
              title: item.courseName ? `${item.title} · ${item.courseName}` : item.title,
              start,
              end: start,
              allDay: true,
              resource: item,
            };
          });
        setEvents(mapped);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل التقويم');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const eventPropGetter = useMemo(
    () => (event) => ({
      style: {
        backgroundColor: TYPE_COLOR[event.resource?.type] || 'var(--dj-primary)',
        borderColor: 'transparent',
        color: '#fff',
        borderRadius: '6px',
        fontSize: '0.78rem',
      },
    }),
    []
  );

  const handleSelectEvent = (event) => {
    const link = event.resource?.link;
    if (link) navigate(link);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">التقويم الأكاديمي</p>
            <h1 className="page-intro__title">مواعيدي ومهامي</h1>
          </div>
        </section>

        {isLoading ? (
          <Loader variant="section" card />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <section className="surface-card">
            <div className="calendar-legend">
              {Object.entries(TYPE_LABEL).map(([type, label]) => (
                <span key={type} className="calendar-legend__item">
                  <span
                    className="calendar-legend__dot"
                    style={{ backgroundColor: TYPE_COLOR[type] }}
                  />
                  {label}
                </span>
              ))}
            </div>

            <div className="student-calendar" dir="rtl">
              <Calendar
                rtl
                localizer={localizer}
                events={events}
                messages={MESSAGES}
                startAccessor="start"
                endAccessor="end"
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
                popup
                style={{ height: 640 }}
                eventPropGetter={eventPropGetter}
                onSelectEvent={handleSelectEvent}
              />
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentCalendar;
