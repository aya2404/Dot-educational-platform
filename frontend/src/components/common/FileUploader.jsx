import React, { useRef, useState } from 'react';
import { BsCloudUpload } from 'react-icons/bs';
import api from '../../utils/api';
import { normalizeAttachments } from '../../utils/attachments';
import AttachmentList from './AttachmentList';

const FileUploader = ({
  value = [],
  onChange,
  disabled,
  label = 'المرفقات',
  hint = '',
  accept,
}) => {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const attachments = normalizeAttachments(value);

  const handlePick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    setError('');
    setIsUploading(true);

    try {
      const response = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedFiles = normalizeAttachments(response.data.data);
      onChange([...(attachments || []), ...uploadedFiles]);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'فشل رفع الملفات');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    const nextAttachments = attachments.filter((_, currentIndex) => currentIndex !== index);
    onChange(nextAttachments);
  };

  return (
    <div className="surface-card surface-card--muted">
      <div className="d-flex flex-column gap-2">
        <div>
          <label className="form-label mb-1">{label}</label>
          {hint ? <p className="field-hint mb-0">{hint}</p> : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleUpload}
          className="d-none"
          disabled={disabled || isUploading}
        />

        <button
          type="button"
          className="btn btn-outline-primary align-self-start"
          onClick={handlePick}
          disabled={disabled || isUploading}
        >
          <BsCloudUpload size={16} />
          {isUploading ? 'جاري رفع الملفات...' : 'رفع ملفات'}
        </button>

        <AttachmentList attachments={attachments} onRemove={removeAttachment} compact />

        {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
      </div>
    </div>
  );
};

export default FileUploader;
