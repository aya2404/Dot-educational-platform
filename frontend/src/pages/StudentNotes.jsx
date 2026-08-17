import React, { useEffect, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  BsPinAngle,
  BsPinAngleFill,
  BsPlusLg,
  BsTrash,
} from 'react-icons/bs';
import AppLayout from '../components/common/AppLayout';
import ConfirmModal from '../components/common/ConfirmModal';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import './StudentNotes.css';

// Sticky-note palette. Values mirror the backend default family (soft pastels).
const PALETTE = [
  { name: 'أصفر', value: '#fef08a' },
  { name: 'وردي', value: '#fbcfe8' },
  { name: 'أزرق', value: '#bfdbfe' },
  { name: 'أخضر', value: '#bbf7d0' },
  { name: 'بنفسجي', value: '#ddd6fe' },
];

// Pinned first, then manual order, then newest — same ordering the API returns.
const sortNotes = (list) =>
  [...list].sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
    if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

const StudentNotes = () => {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [notesResponse, coursesResponse] = await Promise.all([
          api.get('/notes'),
          api.get('/courses'),
        ]);
        if (!active) return;
        setNotes(sortNotes(notesResponse.data.data || []));
        setCourses(coursesResponse.data.data || []);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل الملاحظات');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const flash = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: '', text: '' }), 2500);
  };

  const handleAddNote = async () => {
    setAdding(true);
    try {
      const response = await api.post('/notes', {
        content: 'اكتب ملاحظتك هنا...',
        color: PALETTE[0].value,
        order: 0,
      });
      setNotes((current) => sortNotes([response.data.data, ...current]));
      flash('success', 'تمت إضافة ملاحظة');
    } catch (requestError) {
      flash('danger', requestError.response?.data?.message || 'تعذر إضافة الملاحظة');
    } finally {
      setAdding(false);
    }
  };

  // Optimistic local update; persist the given changes for one note.
  const patchNote = async (id, changes, { resort = false } = {}) => {
    setNotes((current) => {
      const next = current.map((note) => (note._id === id ? { ...note, ...changes } : note));
      return resort ? sortNotes(next) : next;
    });
    try {
      await api.patch(`/notes/${id}`, changes);
    } catch (requestError) {
      flash('danger', requestError.response?.data?.message || 'تعذر حفظ التغيير');
    }
  };

  // Local-only edit while typing; persisted on blur (auto-save).
  const handleLocalEdit = (id, field, value) => {
    setNotes((current) => current.map((note) => (note._id === id ? { ...note, [field]: value } : note)));
  };

  const handleBlurSave = (note, field) => {
    const value = note[field];
    if (field === 'content' && !String(value || '').trim()) return; // don't save empty content
    patchNote(note._id, { [field]: value });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/notes/${pendingDelete._id}`);
      setNotes((current) => current.filter((note) => note._id !== pendingDelete._id));
      flash('success', 'تم حذف الملاحظة');
    } catch (requestError) {
      flash('danger', requestError.response?.data?.message || 'تعذر حذف الملاحظة');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const reordered = Array.from(notes);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Reassign sequential order and persist only the notes whose order changed.
    const changed = [];
    const withOrder = reordered.map((note, index) => {
      if ((note.order || 0) !== index) changed.push({ id: note._id, order: index });
      return { ...note, order: index };
    });

    setNotes(withOrder);
    changed.forEach(({ id, order }) => {
      api.patch(`/notes/${id}`, { order }).catch(() => {});
    });
  };

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">المفكرة</p>
            <h1 className="page-intro__title">ملاحظاتي</h1>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleAddNote} disabled={adding}>
            <BsPlusLg size={16} />
            {adding ? 'جارٍ الإضافة...' : 'ملاحظة جديدة'}
          </button>
        </section>

        {message.text ? <div className={`alert alert-${message.type}`}>{message.text}</div> : null}

        {isLoading ? (
          <Loader variant="section" card />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : notes.length === 0 ? (
          <div className="empty-panel">
            <h3>ابدأ بتدوين أفكارك!</h3>
            <p className="text-muted">أنشئ ملاحظاتك، لوّنها، ثبّتها، ونظّمها كما تحب.</p>
            <button type="button" className="btn btn-primary" onClick={handleAddNote} disabled={adding}>
              <BsPlusLg size={16} />
              إضافة ملاحظة
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="notes-board" direction="horizontal">
              {(provided) => (
                <div className="notes-board" ref={provided.innerRef} {...provided.droppableProps}>
                  {notes.map((note, index) => (
                    <Draggable key={note._id} draggableId={note._id} index={index}>
                      {(dragProvided, snapshot) => (
                        <article
                          className={`note-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                          style={{ backgroundColor: note.color, ...dragProvided.draggableProps.style }}
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                        >
                          <div className="note-card__bar" {...dragProvided.dragHandleProps}>
                            <button
                              type="button"
                              className="note-card__icon-btn"
                              onClick={() => patchNote(note._id, { pinned: !note.pinned }, { resort: true })}
                              aria-label={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                              title={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                            >
                              {note.pinned ? <BsPinAngleFill size={16} /> : <BsPinAngle size={16} />}
                            </button>
                            <button
                              type="button"
                              className="note-card__icon-btn note-card__icon-btn--danger"
                              onClick={() => setPendingDelete(note)}
                              aria-label="حذف"
                              title="حذف"
                            >
                              <BsTrash size={15} />
                            </button>
                          </div>

                          <input
                            className="note-card__title"
                            placeholder="عنوان (اختياري)"
                            value={note.title || ''}
                            onChange={(event) => handleLocalEdit(note._id, 'title', event.target.value)}
                            onBlur={() => handleBlurSave(note, 'title')}
                          />

                          <textarea
                            className="note-card__content"
                            value={note.content || ''}
                            onChange={(event) => handleLocalEdit(note._id, 'content', event.target.value)}
                            onBlur={() => handleBlurSave(note, 'content')}
                            rows={4}
                          />

                          <div className="note-card__palette">
                            {PALETTE.map((swatch) => (
                              <button
                                key={swatch.value}
                                type="button"
                                className={`note-card__swatch ${note.color === swatch.value ? 'active' : ''}`}
                                style={{ backgroundColor: swatch.value }}
                                onClick={() => patchNote(note._id, { color: swatch.value })}
                                aria-label={swatch.name}
                                title={swatch.name}
                              />
                            ))}
                          </div>

                          <select
                            className="note-card__course form-select form-select-sm"
                            value={note.course?._id || note.course || ''}
                            onChange={(event) => patchNote(note._id, { course: event.target.value })}
                          >
                            <option value="">بدون كورس</option>
                            {courses.map((course) => (
                              <option key={course._id} value={course._id}>
                                {course.name}
                              </option>
                            ))}
                          </select>
                        </article>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="حذف الملاحظة"
        message="سيتم حذف هذه الملاحظة نهائياً."
        confirmText="حذف"
        cancelText="إلغاء"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  );
};

export default StudentNotes;
