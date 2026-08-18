import React, { useEffect, useState } from 'react';
import * as FaIcons from 'react-icons/fa';
import { BsLockFill, BsStars } from 'react-icons/bs';
import AppLayout from '../components/common/AppLayout';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import api from '../utils/api';
import './StudentAchievements.css';

// Resolve a react-icons/fa name (e.g. "FaTrophy") to its component, with a
// sensible fallback if a badge references an unknown icon.
const resolveIcon = (name) => FaIcons[name] || FaIcons.FaMedal;

// Maps a badge's criteriaType to the matching stat field for progress display.
const CRITERIA_FIELD = {
  submission_count: 'submissionCount',
  streak_days: 'streakDays',
  lecture_completion: 'lecturesCompleted',
  course_completion: 'coursesCompleted',
  chat_messages: 'chatMessagesSent',
  perfect_score: 'perfectScores',
};

const StudentAchievements = () => {
  const [available, setAvailable] = useState([]);
  const [unlockedById, setUnlockedById] = useState({});
  const [totalXp, setTotalXp] = useState(0);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [mine, all] = await Promise.all([
          api.get('/gamification/badges'),
          api.get('/gamification/available'),
        ]);
        if (!active) return;
        const unlocked = {};
        (mine.data.data || []).forEach((badge) => {
          unlocked[badge._id] = badge;
        });
        setUnlockedById(unlocked);
        setTotalXp(mine.data.totalXp || 0);
        setStats(mine.data.stats || null);
        setAvailable(all.data.data || []);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل الإنجازات');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const unlockedCount = Object.keys(unlockedById).length;

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">التحفيز</p>
            <h1 className="page-intro__title">إنجازاتي</h1>
          </div>
        </section>

        {isLoading ? (
          <Loader variant="section" card />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <section className="surface-card xp-banner">
              <div className="xp-banner__icon">
                <BsStars size={26} />
              </div>
              <div className="xp-banner__main">
                <span className="xp-banner__value">{totalXp}</span>
                <span className="xp-banner__label">نقطة خبرة (XP)</span>
              </div>
              <div className="xp-banner__badges">
                {unlockedCount} / {available.length} شارة
              </div>
            </section>

            <section className="surface-card">
              <div className="section-heading">
                <div>
                  <h2 className="section-heading__title">مجموعة الشارات</h2>
                </div>
              </div>

              {available.length === 0 ? (
                <EmptyState
                  emoji="🏅"
                  title="لم تحصل على أي شارة بعد"
                  message="تفاعل مع الكورسات وأكمل مهامك لكسب الشارات!"
                />
              ) : (
                <div className="badge-grid">
                  {available.map((badge) => {
                    const unlocked = unlockedById[badge._id];
                    const Icon = resolveIcon(badge.icon);
                    const field = CRITERIA_FIELD[badge.criteriaType];
                    const current = stats && field ? stats[field] || 0 : 0;

                    return (
                      <article
                        key={badge._id}
                        className={`badge-card ${unlocked ? 'is-unlocked' : 'is-locked'}`}
                      >
                        <div
                          className="badge-card__medal"
                          style={unlocked ? { backgroundColor: badge.color } : undefined}
                        >
                          {unlocked ? <Icon size={26} /> : <BsLockFill size={22} />}
                        </div>
                        <h3 className="badge-card__name">{badge.name}</h3>
                        <p className="badge-card__desc">{badge.description}</p>

                        {unlocked ? (
                          <span className="badge-card__awarded">
                            تم الحصول عليها في{' '}
                            {new Date(unlocked.awardedAt).toLocaleDateString('ar-EG')}
                          </span>
                        ) : (
                          <span className="badge-card__criteria">
                            {badge.criteria}
                            {stats ? ` · ${Math.min(current, badge.criteriaValue)}/${badge.criteriaValue}` : ''}
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentAchievements;
