import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsBell, BsBellFill, BsCheck2All } from 'react-icons/bs';
import api from '../../utils/api';
import Loader from './Loader';
import { formatArabicDate } from '../../utils/contentTypes';
import './NotificationBell.css';

const NotificationBell = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const prevUnread = useRef(0); // last-known count, kept in sync below
  const firstLoad = useRef(true); // suppress the beep on the very first fetch
  const audioCtxRef = useRef(null);

  // Subtle Web Audio "chime" (sine blip) — no asset/dependency. Silently no-ops
  // if the browser blocks audio (e.g. before any user gesture).
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      /* audio blocked/unsupported — ignore */
    }
  };

  const fetchUnread = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (!mounted.current) return;
      const next = response.data.unreadCount || 0;
      // Beep once per increment (a batch that raises the count fires a single
      // chime), never on the initial load.
      if (!firstLoad.current && next > prevUnread.current) playBeep();
      firstLoad.current = false;
      setUnreadCount(next);
    } catch {
      /* silent — the bell simply shows no badge on failure */
    }
  };

  // Keep the baseline in sync with every count change (including mark-as-read),
  // so a later increment is measured against the true current value.
  useEffect(() => {
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    mounted.current = true;
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000); // lightweight poll
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const loadList = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/notifications');
      if (!mounted.current) return;
      setItems(response.data.data || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (requestError) {
      if (mounted.current) setError(requestError.response?.data?.message || 'تعذر تحميل الإشعارات');
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleItemClick = async (item) => {
    try {
      if (!item.isRead) {
        await api.patch(`/notifications/${item._id}/read`);
        setItems((current) => current.map((n) => (n._id === item._id ? { ...n, isRead: true } : n)));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch {
      /* non-fatal — still navigate */
    }
    if (item.link) {
      setOpen(false);
      onNavigate?.();
      navigate(item.link);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems((current) => current.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر تحديث الإشعارات');
    }
  };

  return (
    <div className="notif-bell">
      <button
        type="button"
        className="notif-bell__button"
        onClick={toggle}
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        {unreadCount > 0 ? <BsBellFill size={16} /> : <BsBell size={16} />}
        <span>الإشعارات</span>
        {unreadCount > 0 ? (
          <span className="notif-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="notif-panel">
          <div className="notif-panel__head">
            <span>الإشعارات</span>
            {items.some((n) => !n.isRead) ? (
              <button type="button" className="notif-panel__markall" onClick={handleMarkAll}>
                <BsCheck2All size={14} /> تحديد الكل كمقروء
              </button>
            ) : null}
          </div>

          <div className="notif-panel__body">
            {isLoading ? (
              <div className="notif-panel__state">
                <Loader variant="inline" />
              </div>
            ) : error ? (
              <div className="alert alert-danger mb-0">{error}</div>
            ) : items.length === 0 ? (
              <div className="notif-panel__empty">لا توجد إشعارات</div>
            ) : (
              <ul className="notif-list">
                {items.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      className={`notif-item ${item.isRead ? '' : 'is-unread'}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="notif-item__title">{item.title}</span>
                      {item.message ? <span className="notif-item__message">{item.message}</span> : null}
                      <span className="notif-item__time">{formatArabicDate(item.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
