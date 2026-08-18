import React, { useEffect, useState } from 'react';
import { BsTrophyFill } from 'react-icons/bs';
import Loader from '../common/Loader';
import api from '../../utils/api';
import './CourseLeaderboard.css';

// Rank medal colours for the top three positions.
const RANK_COLOR = { 1: '#facc15', 2: '#cbd5e1', 3: '#d8a15e' };

const CourseLeaderboard = ({ courseId }) => {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/gamification/leaderboard/course/${courseId}`);
        if (!active) return;
        setRows(response.data.data || []);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل قائمة المتصدرين');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [courseId]);

  return (
    <section className="surface-card course-leaderboard">
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title">
            <BsTrophyFill size={16} className="me-1" style={{ color: 'var(--dj-primary)' }} />
            المتصدرون
          </h2>
        </div>
      </div>

      {isLoading ? (
        <Loader variant="section" />
      ) : error ? (
        <div className="alert alert-danger mb-0">{error}</div>
      ) : rows.length === 0 ? (
        <p className="text-muted mb-0">لا يوجد طلاب في هذا الكورس بعد.</p>
      ) : (
        <ol className="leaderboard-list">
          {rows.map((row) => (
            <li
              key={row.studentId}
              className={`leaderboard-row ${row.isCurrentUser ? 'is-me' : ''}`}
            >
              <span
                className="leaderboard-row__rank"
                style={RANK_COLOR[row.rank] ? { backgroundColor: RANK_COLOR[row.rank], color: '#fff' } : undefined}
              >
                {row.rank}
              </span>
              <span className="leaderboard-row__name">
                {row.name}
                {row.isCurrentUser ? <span className="leaderboard-row__you"> (أنت)</span> : null}
              </span>
              <span className="leaderboard-row__badges">{row.badges} 🏅</span>
              <span className="leaderboard-row__xp">{row.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default CourseLeaderboard;
