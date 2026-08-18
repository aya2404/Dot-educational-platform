import React, { useEffect, useState } from 'react';
import Loader from './Loader';
import api from '../../utils/api';

const FIELDS = [
  { key: 'titleText', label: 'عنوان الشهادة', placeholder: 'Certificate of Completion' },
  { key: 'bodyText', label: 'نص الشهادة', placeholder: 'This certificate is proudly presented to' },
  { key: 'signature1', label: 'التوقيع الأول (المسمّى)', placeholder: 'Academy Director' },
  { key: 'signature1Name', label: 'التوقيع الأول (الاسم)', placeholder: 'أ. د. خالد' },
  { key: 'signature2', label: 'التوقيع الثاني (المسمّى)', placeholder: 'Supervising Instructor' },
  { key: 'signature2Name', label: 'التوقيع الثاني (الاسم)', placeholder: 'د. سارة' },
  { key: 'issueDateText', label: 'نص تاريخ الإصدار', placeholder: 'Issue Date' },
  { key: 'footerText', label: 'نص التذييل', placeholder: 'صادر عن منصة Dot Jordan' },
];

const CertificateTemplateForm = () => {
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get('/certificates/template');
        if (active) setForm(response.data.data || {});
      } catch {
        if (active) setMessage({ type: 'danger', text: 'تعذر تحميل قالب الشهادة' });
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.put('/certificates/template', form);
      setForm(response.data.data || form);
      setMessage({ type: 'success', text: 'تم حفظ قالب الشهادة' });
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر حفظ القالب' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Loader variant="section" card />;
  if (!form) return <div className="alert alert-danger">تعذر تحميل قالب الشهادة</div>;

  return (
    <section className="surface-card" style={{ maxWidth: 640 }}>
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title">قالب الشهادة</h2>
        </div>
      </div>

      {message.text ? <div className={`alert alert-${message.type}`}>{message.text}</div> : null}

      <form className="d-flex flex-column gap-3" onSubmit={handleSave}>
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="form-label" htmlFor={`tpl-${field.key}`}>{field.label}</label>
            <input
              id={`tpl-${field.key}`}
              className="form-control"
              placeholder={field.placeholder}
              value={form[field.key] || ''}
              onChange={(event) => update(field.key, event.target.value)}
              disabled={saving}
            />
          </div>
        ))}

        <div className="d-flex gap-3 flex-wrap align-items-end">
          <div>
            <label className="form-label" htmlFor="tpl-primary">اللون الأساسي</label>
            <input
              id="tpl-primary"
              type="color"
              className="form-control form-control-color"
              value={form.primaryColor || '#6d5acf'}
              onChange={(event) => update('primaryColor', event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="tpl-logo">رابط الشعار (اختياري)</label>
            <input
              id="tpl-logo"
              className="form-control"
              placeholder="https://... أو /uploads/... (يُستخدم شعار المؤسسة إن تُرك فارغاً)"
              value={form.logoUrl || ''}
              onChange={(event) => update('logoUrl', event.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <p className="text-muted small mb-0">
          ملاحظة: يستخدم مولّد الشهادة خطوطاً لاتينية، لذا يُفضّل النصوص الإنجليزية للعناوين حتى تظهر بشكل صحيح.
        </p>

        <button type="submit" className="btn btn-primary align-self-start" disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ القالب'}
        </button>
      </form>
    </section>
  );
};

export default CertificateTemplateForm;
