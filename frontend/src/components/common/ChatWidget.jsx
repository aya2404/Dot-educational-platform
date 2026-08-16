import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BsArrowRight, BsChatDotsFill, BsSend, BsXLg } from 'react-icons/bs';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './ChatWidget.css';

// Floating course-page chat widget. REST + 5s polling (no realtime dependency),
// matching the notification system's approach. All data is tenant-scoped by the
// backend; this component only renders what the API returns for the caller.
// Pinned bottom-right (see ChatWidget.css — offset past the desktop sidebar).
const ChatWidget = ({ course }) => {
  const { user } = useAuth();
  const myId = String(user?._id || user?.id || '');

  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef(null);
  const bodyRef = useRef(null);

  const teacherId = String(course?.teacher?._id || course?.teacher || '');
  const canMessageInstructor = Boolean(teacherId) && teacherId !== myId;

  const chatTitle = useCallback(
    (chat) => {
      if (!chat) return 'محادثة';
      if (chat.isGroupChat) return chat.course?.name ? `مجموعة: ${chat.course.name}` : 'محادثة جماعية';
      const other = (chat.participants || []).find((p) => String(p._id) !== myId);
      return other?.name || 'محادثة';
    },
    [myId]
  );

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setError('');
    try {
      const response = await api.get('/chats');
      setChats(response.data.data || []);
    } catch {
      setError('تعذر تحميل المحادثات');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId) => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`);
      setMessages(response.data.data || []);
      api.patch(`/chats/${chatId}/read`).catch(() => {});
    } catch {
      /* silent — a failed poll should not disrupt the open thread */
    }
  }, []);

  // Load the chat list whenever the drawer opens.
  useEffect(() => {
    if (open) loadChats();
  }, [open, loadChats]);

  // Poll the open thread every 5 seconds.
  useEffect(() => {
    if (!activeChat) return undefined;
    loadMessages(activeChat._id);
    pollRef.current = setInterval(() => loadMessages(activeChat._id), 5000);
    return () => clearInterval(pollRef.current);
  }, [activeChat, loadMessages]);

  // Keep the thread pinned to the latest message.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  const openThread = (chat) => {
    setMessages([]);
    setActiveChat(chat);
  };

  const startInstructorChat = async () => {
    if (!teacherId) return;
    setError('');
    try {
      const response = await api.post('/chats', { userId: teacherId });
      const chat = response.data.data;
      setChats((current) => (current.some((c) => c._id === chat._id) ? current : [chat, ...current]));
      openThread(chat);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر بدء المحادثة');
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeChat) return;
    setSending(true);
    setError('');
    try {
      const response = await api.post(`/chats/${activeChat._id}/messages`, { content });
      setMessages((current) => [...current, response.data.data]);
      setDraft('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const isMine = (message) => String(message.sender?._id || message.sender) === myId;
  const formatTime = (value) => {
    try {
      return new Date(value).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="btn btn-primary chat-widget-fab"
          onClick={() => setOpen(true)}
          aria-label="المحادثات"
        >
          <BsChatDotsFill size={22} />
        </button>
      ) : null}

      {open ? (
        <div className="surface-card chat-widget-panel" role="dialog" aria-label="المحادثات">
          <div
            className="d-flex align-items-center justify-content-between"
            style={{ padding: '12px 16px', borderBottom: '1px solid var(--dj-border)' }}
          >
            <div className="d-flex align-items-center gap-2">
              {activeChat ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setActiveChat(null)}
                  aria-label="رجوع"
                >
                  <BsArrowRight size={14} />
                </button>
              ) : null}
              <strong>{activeChat ? chatTitle(activeChat) : 'المحادثات'}</strong>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
            >
              <BsXLg size={14} />
            </button>
          </div>

          {error ? <div className="alert alert-danger mb-0" style={{ margin: 12 }}>{error}</div> : null}

          {!activeChat ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {canMessageInstructor ? (
                <button type="button" className="btn btn-primary w-100 mb-3" onClick={startInstructorChat}>
                  مراسلة المدرّس
                </button>
              ) : null}

              {loadingChats ? (
                <p className="text-muted text-center mb-0">جارٍ التحميل...</p>
              ) : chats.length === 0 ? (
                <p className="text-muted text-center mb-0">لا توجد محادثات بعد</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {chats.map((chat) => (
                    <button
                      key={chat._id}
                      type="button"
                      className="btn btn-outline-primary text-start"
                      onClick={() => openThread(chat)}
                    >
                      {chatTitle(chat)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {messages.length === 0 ? (
                  <p className="text-muted text-center mb-0">ابدأ المحادثة بإرسال رسالة</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`d-flex ${isMine(message) ? 'justify-content-start' : 'justify-content-end'}`}
                      >
                        <div
                          className="surface-card"
                          style={{
                            padding: '8px 12px',
                            maxWidth: '80%',
                            background: isMine(message) ? 'var(--dj-primary-soft)' : 'var(--dj-card)',
                          }}
                        >
                          {!isMine(message) ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--dj-text-muted)' }}>
                              {message.sender?.name || 'مستخدم'}
                            </div>
                          ) : null}
                          <div style={{ wordBreak: 'break-word' }}>{message.content}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--dj-text-faint)', textAlign: 'end' }}>
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                className="d-flex gap-2"
                onSubmit={handleSend}
                style={{ padding: 12, borderTop: '1px solid var(--dj-border)' }}
              >
                <input
                  className="form-control"
                  placeholder="اكتب رسالة..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={sending}
                  aria-label="نص الرسالة"
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
                  <BsSend size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  );
};

export default ChatWidget;
