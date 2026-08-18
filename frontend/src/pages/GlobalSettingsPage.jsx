import React, { useEffect, useState } from 'react';
import AppLayout from '../components/common/AppLayout';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const EMPTY = {
  platformName: '',
  primaryColor: '#6d5acf',
  secondaryColor: '#ff6b6b',
  logoUrl: '',
  faviconUrl: '',
};

const GlobalSettingsPage = () => {
  const { refreshGlobal } = useTheme();
  const [form, setForm] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get('/platform/settings');
        if (!active) return;
        const data = response.data.data || {};
        setForm({
          platformName: data.platformName || '',
          primaryColor: data.primaryColor || '#6d5acf',
          secondaryColor: data.secondaryColor || '#ff6b6b',
          logoUrl: data.logoUrl || '',
          faviconUrl: data.faviconUrl || '',
        });
      } catch {
        setMessage({ type: 'danger', text: 'تعذر تحميل الإعدادات العامة' });
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  // Upload an image file via the existing hardened /uploads endpoint (rate-limited,
  // MIME/extension-filtered; SVG is intentionally rejected) and store the URL.
  const uploadImage = async (field, file) => {
    if (!file) return;
    setUploading(field);
    setMessage({ type: '', text: '' });
    try {
      const data = new FormData();
      data.append('files', file);
      const response = await api.post('/uploads', data);
      const url = response.data.data?.[0]?.url;
      if (url) update(field, url);
      else setMessage({ type: 'danger', text: 'تعذر رفع الملف' });
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر رفع الملف' });
    } finally {
      setUploading('');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/platform/settings', form);
      await refreshGlobal?.(); // re-apply global branding (favicon/colors) immediately
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات العامة' });
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">المشرف الرئيسي</p>
            <h1 className="page-intro__title">الإعدادات العامة للمنصة</h1>
          </div>
        </section>

        {message.text ? <div className={`alert alert-${message.type}`}>{message.text}</div> : null}

        {isLoading ? (
          <Loader variant="section" card />
        ) : (
          <section className="surface-card" style={{ maxWidth: 620 }}>
            <div className="section-heading">
              <div>
                <h2 className="section-heading__title">العلامة التجارية العامة (تُطبَّق على كل المستأجرين كإعداد افتراضي)</h2>
              </div>
            </div>

            <form className="d-flex flex-column gap-3" onSubmit={handleSave}>
              <div>
                <label className="form-label" htmlFor="global-name">اسم المنصة</label>
                <input
                  id="global-name"
                  className="form-control"
                  value={form.platformName}
                  onChange={(event) => update('platformName', event.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="d-flex gap-3 flex-wrap">
                <div className="flex-grow-1">
                  <label className="form-label" htmlFor="global-primary">اللون الأساسي</label>
                  <input
                    id="global-primary"
                    type="color"
                    className="form-control form-control-color"
                    value={form.primaryColor}
                    onChange={(event) => update('primaryColor', event.target.value)}
                    disabled={saving}
                    title="اللون الأساسي"
                  />
                </div>
                <div className="flex-grow-1">
                  <label className="form-label" htmlFor="global-secondary">اللون الثانوي</label>
                  <input
                    id="global-secondary"
                    type="color"
                    className="form-control form-control-color"
                    value={form.secondaryColor}
                    onChange={(event) => update('secondaryColor', event.target.value)}
                    disabled={saving}
                    title="اللون الثانوي"
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="global-logo">الشعار العام (يظهر في صفحة الدخول)</label>
                {form.logoUrl ? (
                  <div className="mb-2">
                    <img
                      src={form.logoUrl}
                      alt="معاينة الشعار"
                      style={{ maxHeight: 64, maxWidth: '100%', borderRadius: 8, background: '#fff', padding: 4 }}
                    />
                  </div>
                ) : null}
                <input
                  id="global-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="form-control"
                  onChange={(event) => uploadImage('logoUrl', event.target.files?.[0])}
                  disabled={saving || uploading === 'logoUrl'}
                />
                <input
                  className="form-control mt-2"
                  placeholder="أو الصق رابطاً: https://... أو /uploads/..."
                  value={form.logoUrl}
                  onChange={(event) => update('logoUrl', event.target.value)}
                  disabled={saving}
                />
                {uploading === 'logoUrl' ? <span className="text-muted small">جارٍ الرفع...</span> : null}
              </div>

              <div>
                <label className="form-label" htmlFor="global-favicon">أيقونة الموقع (Favicon)</label>
                {form.faviconUrl ? (
                  <div className="mb-2">
                    <img
                      src={form.faviconUrl}
                      alt="معاينة الأيقونة"
                      style={{ height: 32, width: 32, borderRadius: 6, background: '#fff', padding: 2 }}
                    />
                  </div>
                ) : null}
                <input
                  id="global-favicon"
                  type="file"
                  accept="image/png,image/x-icon,image/webp"
                  className="form-control"
                  onChange={(event) => uploadImage('faviconUrl', event.target.files?.[0])}
                  disabled={saving || uploading === 'faviconUrl'}
                />
                <input
                  className="form-control mt-2"
                  placeholder="أو الصق رابطاً: https://... أو /uploads/..."
                  value={form.faviconUrl}
                  onChange={(event) => update('faviconUrl', event.target.value)}
                  disabled={saving}
                />
                {uploading === 'faviconUrl' ? <span className="text-muted small">جارٍ الرفع...</span> : null}
              </div>

              <button type="submit" className="btn btn-primary align-self-start" disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات العامة'}
              </button>
            </form>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default GlobalSettingsPage;
