import React, { useState } from 'react';
import {
  BsCheck2Circle,
  BsClipboardCheck,
  BsCollectionPlay,
  BsFolder2Open,
  BsMegaphone,
  BsPencilSquare,
  BsSend,
  BsTrash3,
} from 'react-icons/bs';
import AttachmentList from '../common/AttachmentList';
import ConfirmModal from '../common/ConfirmModal';
import TaskSubmissionModal from './TaskSubmissionModal';
import {
  CONTENT_TYPES,
  formatArabicDate,
  formatDueDate,
  isDueDatePassed,
} from '../../utils/contentTypes';
import './Timeline.css';

const TYPE_ICONS = {
  lecture: BsCollectionPlay,
  material: BsFolder2Open,
  task: BsClipboardCheck,
  announcement: BsMegaphone,
};

const Timeline = ({
  content,
  currentUser,
  isStudent,
  completedLectures,
  submissions,
  onToggleComplete,
  onRefreshSubmissions,
  onDeleteContent,
  onEditContent,
}) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [itemPendingDelete, setItemPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const groupedContent = (content || []).reduce((result, item) => {
    const dateKey = new Date(item.contentDate).toISOString().split('T')[0];

    if (!result[dateKey]) {
      result[dateKey] = [];
    }

    result[dateKey].push(item);
    return result;
  }, {});

  const sortedDates = Object.keys(groupedContent).sort();

  const handleDeleteContent = async () => {
    if (!itemPendingDelete || typeof onDeleteContent !== 'function') {
      return;
    }

    setIsDeleting(true);
    setActionError('');

    try {
      await onDeleteContent(itemPendingDelete._id);
      setItemPendingDelete(null);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'تعذر حذف المحتوى حالياً');
    } finally {
      setIsDeleting(false);
    }
  };

  if (sortedDates.length === 0) {
    return (
      <div className="surface-card">
        <div className="empty-panel">
          <h3>لا يوجد محتوى في هذا الكورس حتى الآن</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      {actionError ? <div className="alert alert-danger mb-0">{actionError}</div> : null}

      <div className="timeline-view">
        {sortedDates.map((dateKey) => (
          <section key={dateKey} className="timeline-group">
            <div className="timeline-group__label">{formatArabicDate(dateKey)}</div>

            <div className="timeline-group__items">
              {groupedContent[dateKey].map((item) => {
                const typeConfig = CONTENT_TYPES[item.type] || CONTENT_TYPES.lecture;
                const Icon = TYPE_ICONS[item.type] || BsCollectionPlay;
                const isCompleted = completedLectures?.includes(item._id);
                const submission = submissions?.[item._id];
                const isPastDeadline = item.type === 'task' && isDueDatePassed(item.dueDate);
                const canEditContent = !isStudent && item.permissions?.canEdit;
                const canDeleteContent = !isStudent && item.permissions?.canDelete;
                const canManageSubmission = submission
                  ? submission.permissions?.canEdit
                  : !isPastDeadline;
                const submissionStatus = submission
                  ? submission.permissions?.isPastDeadline
                    ? 'تم إغلاق التسليم بعد انتهاء الموعد'
                    : 'تم حفظ التسليم'
                  : isPastDeadline
                    ? 'انتهى موعد التسليم'
                    : '';

                return (
                  <article key={item._id} className="timeline-entry">
                    <div className="timeline-entry__header">
                      <div className="timeline-entry__type" style={{ backgroundColor: typeConfig.bgColor }}>
                        <Icon size={15} />
                        <span>{typeConfig.label}</span>
                      </div>

                      <div className="timeline-entry__header-actions">
                        {isStudent && item.type === 'lecture' ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${isCompleted ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => onToggleComplete(item._id)}
                          >
                            <BsCheck2Circle size={14} />
                            {isCompleted ? 'تمت المتابعة' : 'تحديد كمكتمل'}
                          </button>
                        ) : null}

                        {canEditContent ? (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEditContent?.(item)}
                          >
                            <BsPencilSquare size={14} />
                            تعديل
                          </button>
                        ) : null}

                        {canDeleteContent ? (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setItemPendingDelete(item)}
                          >
                            <BsTrash3 size={14} />
                            حذف
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="timeline-entry__body">
                      <div className="timeline-entry__title-row">
                        <h3>{item.title}</h3>
                        {!isStudent && item.createdBy?.name ? (
                          <span className="timeline-entry__owner">
                            بواسطة {item.createdBy.name}
                          </span>
                        ) : null}
                      </div>

                      {item.body ? <p>{item.body}</p> : null}

                      <AttachmentList attachments={item.attachments} compact />

                      {item.type === 'task' && item.dueDate ? (
                        <div className="timeline-entry__meta">
                          موعد التسليم: {formatDueDate(item.dueDate)}
                        </div>
                      ) : null}
                    </div>

                    {isStudent && item.type === 'task' ? (
                      <div className="timeline-entry__footer">
                        <span className={`timeline-entry__status ${isPastDeadline ? 'is-muted' : ''}`}>
                          {submissionStatus}
                        </span>
                        <button
                          type="button"
                          className={`btn ${submission ? 'btn-outline-primary' : 'btn-primary'}`}
                          onClick={() => setSelectedTask(item)}
                          disabled={!canManageSubmission}
                        >
                          <BsSend size={16} />
                          {!canManageSubmission
                            ? 'أغلق التسليم'
                            : submission
                              ? 'تعديل التسليم'
                              : 'تسليم المهمة'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedTask ? (
        <TaskSubmissionModal
          task={selectedTask}
          existingSubmission={submissions?.[selectedTask._id]}
          onClose={(submitted) => {
            setSelectedTask(null);

            if (submitted && onRefreshSubmissions) {
              onRefreshSubmissions();
            }
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(itemPendingDelete)}
        title="حذف المحتوى"
        message={
          itemPendingDelete
            ? `سيتم حذف "${itemPendingDelete.title}" مع أي تسليمات مرتبطة به عند الحاجة.`
            : ''
        }
        confirmText="حذف المحتوى"
        cancelText="إلغاء"
        loading={isDeleting}
        onCancel={() => !isDeleting && setItemPendingDelete(null)}
        onConfirm={handleDeleteContent}
      />
    </>
  );
};

export default Timeline;
