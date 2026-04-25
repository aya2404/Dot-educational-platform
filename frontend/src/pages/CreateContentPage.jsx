import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BsArrowRight, BsLink45Deg, BsPencilSquare, BsPlus, BsSave } from 'react-icons/bs';
import AppLayout from '../components/common/AppLayout';
import FileUploader from '../components/common/FileUploader';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  CONTENT_TYPES,
  formatDueDate,
} from '../utils/contentTypes';
import { createExternalAttachment, normalizeAttachments } from '../utils/attachments';
import { getRoleCoursePath, getRoleHomePath } from '../utils/auth';

const getDateInputValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
};

const INITIAL_FORM = {
  courseId: '',
  type: 'lecture',
  title: '',
  body: '',
  contentDate: getDateInputValue(new Date()),
  dueDate: '',
  maxScore: 100,
  attachments: [],
};

const CreateContentPage = () => {
  const navigate = useNavigate();
  const { contentId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isEditMode = Boolean(contentId);
  const presetCourseId = searchParams.get('courseId') || '';

  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [linkDraft, setLinkDraft] = useState({ url: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      setPageLoading(true);
      setError('');

      try {
        const requests = [api.get('/courses')];

        if (isEditMode) {
          requests.push(api.get(`/content/${contentId}`));
        }

        const [coursesResponse, contentResponse] = await Promise.all(requests);
        const nextCourses = coursesResponse.data.data || [];

        setCourses(nextCourses);

        if (contentResponse) {
          const currentContent = contentResponse.data.data;
          setForm({
            courseId: currentContent.course?._id || currentContent.course || '',
            type: currentContent.type || 'lecture',
            title: currentContent.title || '',
            body: currentContent.body || '',
            contentDate: getDateInputValue(currentContent.contentDate) || getDateInputValue(new Date()),
            dueDate: getDateInputValue(currentContent.dueDate),
            maxScore: currentContent.maxScore || 100,
            attachments: normalizeAttachments(currentContent.attachments),
          });
          return;
        }

        setForm((currentForm) => ({
          ...currentForm,
          courseId: currentForm.courseId || presetCourseId || nextCourses[0]?._id || '',
        }));
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'تعذر تحميل البيانات المطلوبة');
      } finally {
        setPageLoading(false);
      }
    };

    loadPage();
  }, [contentId, isEditMode, presetCourseId]);

  const typeConfig = CONTENT_TYPES[form.type] || CONTENT_TYPES.lecture;
  const destinationPath = getRoleCoursePath(user?.role, form.courseId) || getRoleHomePath(user?.role);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setError('');
  };

  const handleAddExternalLink = () => {
    try {
      // eslint-disable-next-line no-new
      new URL(linkDraft.url);
    } catch {
      setError('أدخل رابطاً صحيحاً قبل الإضافة');
      return;
    }

    const nextAttachment = createExternalAttachment(linkDraft);

    if (!nextAttachment) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      attachments: [...normalizeAttachments(currentForm.attachments), nextAttachment],
    }));
    setLinkDraft({ url: '', name: '' });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.courseId || !form.title.trim()) {
      setError('الرجاء اختيار الكورس وإدخال العنوان');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      course: form.courseId,
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim(),
      contentDate: form.contentDate,
      dueDate: form.type === 'task' ? form.dueDate : undefined,
      maxScore: form.type === 'task' ? Number(form.maxScore) : undefined,
      attachments: normalizeAttachments(form.attachments),
    };

    try {
      if (isEditMode) {
        await api.put(`/content/${contentId}`, payload);
      } else {
        await api.post('/content', payload);
      }

      setSuccess(true);
      window.setTimeout(() => navigate(destinationPath, { replace: true }), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'تعذر حفظ المحتوى');
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="app-page">
        <button type="button" className="btn btn-outline-primary mb-4" onClick={() => navigate(-1)}>
          <BsArrowRight size={16} />
          العودة
        </button>

        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">{isEditMode ? 'تعديل محتوى' : 'إنشاء محتوى'}</p>
            <h1 className="page-intro__title">
              {isEditMode ? 'تعديل المحتوى الحالي' : 'إضافة محتوى جديد للكورس'}
            </h1>
          </div>
        </section>

        {pageLoading ? (
          <div className="surface-card section-state">
            <div className="spinner-border text-primary" role="status" aria-hidden="true" />
          </div>
        ) : null}

        {!pageLoading ? (
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <section className="surface-card">
                {success ? (
                  <div className="empty-panel">
                    <h3>{isEditMode ? 'تم تحديث المحتوى بنجاح' : 'تم إنشاء المحتوى بنجاح'}</h3>
                  </div>
                ) : (
                  <form className="d-flex flex-column gap-4" onSubmit={handleSubmit}>
                    {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label">الكورس</label>
                        <select
                          className="form-select"
                          value={form.courseId}
                          onChange={(event) => handleChange('courseId', event.target.value)}
                          disabled={isSubmitting || isEditMode}
                        >
                          <option value="">اختر الكورس</option>
                          {courses.map((course) => (
                            <option key={course._id} value={course._id}>
                              {course.name} - {course.group || 'بدون مجموعة'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">تاريخ الجلسة</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.contentDate}
                          onChange={(event) => handleChange('contentDate', event.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">نوع المحتوى</label>
                      <div className="type-selector">
                        {Object.entries(CONTENT_TYPES).map(([typeKey, config]) => (
                          <button
                            key={typeKey}
                            type="button"
                            className={`type-selector__button ${form.type === typeKey ? 'active' : ''}`}
                            style={form.type === typeKey ? { backgroundColor: config.bgColor } : undefined}
                            onClick={() => handleChange('type', typeKey)}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">العنوان</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.title}
                        onChange={(event) => handleChange('title', event.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="form-label">الوصف أو التفاصيل</label>
                      <textarea
                        className="form-control"
                        rows={5}
                        value={form.body}
                        onChange={(event) => handleChange('body', event.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <FileUploader
                      value={form.attachments}
                      onChange={(attachments) => handleChange('attachments', attachments)}
                      disabled={isSubmitting}
                      label="ملفات وصور المحتوى"
                    />

                    <div className="surface-card surface-card--muted">
                      <div className="d-flex flex-column gap-3">
                        <div>
                          <label className="form-label mb-1">رابط خارجي</label>
                        </div>

                        <div className="row g-2">
                          <div className="col-12 col-md-7">
                            <input
                              type="url"
                              className="form-control"
                              placeholder="https://example.com"
                              value={linkDraft.url}
                              onChange={(event) =>
                                setLinkDraft((currentDraft) => ({ ...currentDraft, url: event.target.value }))
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="col-12 col-md-5">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="اسم الرابط (اختياري)"
                              value={linkDraft.name}
                              onChange={(event) =>
                                setLinkDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline-primary align-self-start"
                          onClick={handleAddExternalLink}
                        >
                          <BsLink45Deg size={16} />
                          إضافة رابط خارجي
                        </button>
                      </div>
                    </div>

                    {form.type === 'task' ? (
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label">موعد التسليم</label>
                          <input
                            type="date"
                            className="form-control"
                            value={form.dueDate}
                            onChange={(event) => handleChange('dueDate', event.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label">الدرجة القصوى</label>
                          <input
                            type="number"
                            className="form-control"
                            min={1}
                            max={1000}
                            value={form.maxScore}
                            onChange={(event) => handleChange('maxScore', event.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(-1)}
                        disabled={isSubmitting}
                      >
                        إلغاء
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isEditMode ? <BsSave size={16} /> : <BsPlus size={16} />}
                        {isSubmitting
                          ? isEditMode
                            ? 'جاري الحفظ...'
                            : 'جاري الإنشاء...'
                          : isEditMode
                            ? 'حفظ التعديلات'
                            : 'نشر المحتوى'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>

            <div className="col-12 col-xl-4">
              <section className="surface-card">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title">المعاينة</h2>
                  </div>
                </div>

                <div className="preview-card">
                  <span className="preview-card__badge" style={{ backgroundColor: typeConfig.bgColor }}>
                    {typeConfig.label}
                  </span>
                  {form.title ? <h3>{form.title}</h3> : null}
                  {form.body ? <p>{form.body}</p> : null}
                  <div className="preview-card__meta">
                    <span>المرفقات: {normalizeAttachments(form.attachments).length}</span>
                    {form.type === 'task' && form.dueDate ? <span>الموعد: {formatDueDate(form.dueDate)}</span> : null}
                    {isEditMode ? (
                      <span>
                        <BsPencilSquare size={14} />
                        وضع التعديل
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default CreateContentPage;
