import React from 'react';
import {
  BsBoxArrowUpLeft,
  BsFileEarmarkText,
  BsImage,
  BsLink45Deg,
  BsTrash3,
} from 'react-icons/bs';
import {
  formatAttachmentSize,
  isImageAttachment,
  normalizeAttachments,
} from '../../utils/attachments';

const getAttachmentIcon = (attachment) => {
  if (attachment.kind === 'link') {
    return BsLink45Deg;
  }

  if (isImageAttachment(attachment)) {
    return BsImage;
  }

  return BsFileEarmarkText;
};

const AttachmentList = ({ attachments = [], onRemove, compact = false }) => {
  const normalizedAttachments = normalizeAttachments(attachments);

  if (!normalizedAttachments.length) {
    return null;
  }

  return (
    <div className={`attachment-list ${compact ? 'attachment-list--compact' : ''}`}>
      {normalizedAttachments.map((attachment, index) => {
        const Icon = getAttachmentIcon(attachment);
        const meta = [attachment.kind === 'link' ? 'رابط خارجي' : 'ملف مرفق', formatAttachmentSize(attachment.size)]
          .filter(Boolean)
          .join(' • ');

        return (
          <div key={`${attachment.url}-${index}`} className="attachment-item">
            <div className="attachment-item__main">
              <span className="attachment-item__icon">
                <Icon size={16} />
              </span>
              <div className="attachment-item__content">
                <span className="attachment-item__name">{attachment.name || `مرفق ${index + 1}`}</span>
                {meta ? <span className="attachment-item__meta">{meta}</span> : null}
              </div>
            </div>

            <div className="attachment-item__actions">
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm"
              >
                <BsBoxArrowUpLeft size={14} />
                فتح
              </a>

              {typeof onRemove === 'function' ? (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onRemove(index)}
                >
                  <BsTrash3 size={14} />
                  حذف
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentList;
