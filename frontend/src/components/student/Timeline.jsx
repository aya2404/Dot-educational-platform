import React, { useState } from 'react';
import {
  BsCheck2Circle,
  BsClipboardCheck,
  BsCloudArrowUp,
  BsCollectionPlay,
  BsEyeSlash,
  BsFolder2Open,
  BsLink45Deg,
  BsMegaphone,
  BsPencilSquare,
  BsPlayBtn,
  BsSend,
  BsTrash3,
} from 'react-icons/bs';
import AttachmentList from '../common/AttachmentList';
import ConfirmModal from '../common/ConfirmModal';
import TaskSubmissionModal from './TaskSubmissionModal';
import SubmissionsReviewModal from '../teacher/SubmissionsReviewModal';
import {
  CONTENT_TYPES,
  formatArabicDate,
  formatDueDate,
  isDueDatePassed,
} from '../../utils/contentTypes';
import { getContentVideo } from '../../utils/videoEmbed';
import './Timeline.css';

const TYPE_ICONS = {
  lecture: BsCollectionPlay,
  video: BsPlayBtn,
  material: BsFolder2Open,
  link: BsLink45Deg,
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
  onTogglePublish,
}) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewTask, setReviewTask] = useState(null);
  const [itemPendingDelete, setItemPendingDelete] = useState(null);
  const [itemPendingUnpublish, setItemPendingUnpublish] = useState(null);
  const [togglingPublishId, setTogglingPublishId] = useState('');
  const [isUnpublishing, setIsUnpublishing] = useState(false);
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

  const runTogglePublish = async (item, nextPublished) => {
    if (typeof onTogglePublish !== 'function') return;
    setTogglingPublishId(item._id);
    setActionError('');
    try {
      await onTogglePublish(item, nextPublished);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'تعذر تحديث حالة النشر');
    } finally {
      setTogglingPublishId('');
    }
  };

  const handlePublish = (item) => runTogglePublish(item, true); // draft -> publish (direct)

  const handleConfirmUnpublish = async () => {
    if (!itemPendingUnpublish) return;
    setIsUnpublishing(true);
    await runTogglePublish(itemPendingUnpublish, false);
    setIsUnpublishing(false);
    setItemPendingUnpublish(null);
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
                const contentVideo = item.type === 'video' ? getContentVideo(item) : null;
                const bodyIsVideoUrl = contentVideo && contentVideo.url === (item.body || '').trim();
                const isPastDeadline = item.type === 'task' && isDueDatePassed(item.dueDate);
                const canEditContent = !isStudent && item.permissions?.canEdit;
                const canDeleteContent = !isStudent && item.permissions?.canDelete;
                const canManagePublish = !isStudent && item.permissions?.canEdit;
                const isDraft = item.isPublished === false; // undefined/true => published
                const isTogglingPublish = togglingPublishId === item._id;
                // Late submissions are accepted — a student can always submit or
                // edit their own task; the server flags lateness authoritatively.
                const canManageSubmission = true;
                const isLateSubmission = submission?.isLate === true;
                const submissionStatus = submission
                  ? isLateSubmission
                    ? 'تم التسليم (متأخر)'
                    : 'تم حفظ التسليم'
                  : isPastDeadline
                    ? 'انتهى الموعد — يمكنك التسليم متأخراً'
                    : '';

                return (
                  <article key={item._id} className="timeline-entry">
                    <div className="timeline-entry__header">
                      <div className="d-flex align-items-center gap-2">
                        <div className="timeline-entry__type" style={{ backgroundColor: typeConfig.bgColor }}>
                          <Icon size={15} />
                          <span>{typeConfig.label}</span>
                        </div>
                        {!isStudent && isDraft ? (
                          <span className="timeline-entry__draft-badge">
                            <BsEyeSlash size={12} /> مسودة
                          </span>
                        ) : null}
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

                        {canManagePublish ? (
                          isDraft ? (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => handlePublish(item)}
                              disabled={isTogglingPublish}
                            >
                              <BsCloudArrowUp size={14} />
                              {isTogglingPublish ? '...' : 'نشر'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => setItemPendingUnpublish(item)}
                              disabled={isTogglingPublish}
                            >
                              <BsEyeSlash size={14} />
                              {isTogglingPublish ? '...' : 'إلغاء النشر'}
                            </button>
                          )
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

                      {item.body && !bodyIsVideoUrl ? <p>{item.body}</p> : null}

                      {contentVideo ? (
                        <div className="content-video">
                          <div className="content-video__frame">
                            <iframe
                              src={contentVideo.embed.src}
                              title={item.title}
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <a
                            className="content-video__source"
                            href={contentVideo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            فتح الفيديو في نافذة جديدة
                          </a>
                        </div>
                      ) : null}

                      <AttachmentList attachments={item.attachments} compact />

                      {item.type === 'task' && item.dueDate ? (
                        <div className="timeline-entry__meta">
                          موعد التسليم: {formatDueDate(item.dueDate)}
                        </div>
                      ) : null}
                    </div>

                    {isStudent && item.type === 'task' && submission?.status === 'graded' ? (
                      <div className="timeline-entry__grade">
                        <span className="timeline-entry__grade-score">
                          الدرجة: {submission.grade}
                          {typeof item.maxScore === 'number' ? ` / ${item.maxScore}` : ''}
                          {isLateSubmission ? <span className="timeline-entry__late-badge">متأخر</span> : null}
                        </span>
                        {submission.feedback ? (
                          <p className="timeline-entry__grade-feedback">
                            ملاحظات المدرس: {submission.feedback}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {isStudent && item.type === 'task' ? (
                      <div className="timeline-entry__footer">
                        <span className="timeline-entry__status">
                          {submissionStatus}
                          {isLateSubmission ? <span className="timeline-entry__late-badge">متأخر</span> : null}
                        </span>
                        <button
                          type="button"
                          className={`btn ${submission ? 'btn-outline-primary' : 'btn-primary'}`}
                          onClick={() => setSelectedTask(item)}
                        >
                          <BsSend size={16} />
                          {submission
                            ? 'تعديل التسليم'
                            : isPastDeadline
                              ? 'تسليم متأخر'
                              : 'تسليم المهمة'}
                        </button>
                      </div>
                    ) : null}

                    {!isStudent && item.type === 'task' ? (
                      <div className="timeline-entry__footer">
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => setReviewTask(item)}
                        >
                          <BsClipboardCheck size={16} />
                          عرض التسليمات وتقييمها
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

      {reviewTask ? (
        <SubmissionsReviewModal task={reviewTask} onClose={() => setReviewTask(null)} />
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

      <ConfirmModal
        open={Boolean(itemPendingUnpublish)}
        title="إلغاء نشر المحتوى"
        message={
          itemPendingUnpublish
            ? `سيتم تحويل "${itemPendingUnpublish.title}" إلى مسودة ولن يعود مرئياً للطلاب حتى إعادة نشره.`
            : ''
        }
        confirmText="إلغاء النشر"
        cancelText="تراجع"
        loading={isUnpublishing}
        onCancel={() => !isUnpublishing && setItemPendingUnpublish(null)}
        onConfirm={handleConfirmUnpublish}
      />
    </>
  );
};

export default Timeline;
