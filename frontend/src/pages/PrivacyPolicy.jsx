import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo';
import { useTheme } from '../context/ThemeContext';

// Public, static privacy policy. The platform name is taken from the active
// branding (tenant → global → default) so it stays in sync with white-labeling.
const PrivacyPolicy = () => {
  const { settings, globalSettings } = useTheme();
  const name = settings?.platformName || globalSettings?.platformName || 'Dot Jordan';

  return (
    <div className="legal-page" dir="rtl">
      <div className="legal-page__inner">
        <Link to="/login" className="legal-page__brand">
          <BrandLogo />
        </Link>

        <section className="surface-card legal-page__card">
          <p className="page-intro__eyebrow">المستندات القانونية</p>
          <h1 className="page-intro__title">سياسة الخصوصية</h1>
          <p className="text-muted">آخر تحديث: 2026</p>

          <h2>1. جمع البيانات</h2>
          <p>
            تجمع منصة {name} البيانات اللازمة لتقديم الخدمة التعليمية فقط، مثل الاسم واسم المستخدم
            والدور (طالب/مدرس/مشرف) وسجل النشاط الدراسي (التسليمات، المحاضرات المكتملة، الدرجات).
            لا نجمع بيانات حساسة لا علاقة لها بالخدمة.
          </p>

          <h2>2. استخدام البيانات</h2>
          <p>
            تُستخدم بياناتك لتشغيل حسابك، عرض تقدمك الدراسي، إصدار الشهادات، وإرسال الإشعارات
            المتعلقة بكورساتك. لا نبيع بياناتك لأي طرف ثالث ولا نستخدمها لأغراض إعلانية.
          </p>

          <h2>3. ملفات تعريف الارتباط (Cookies)</h2>
          <p>
            نستخدم التخزين المحلي (localStorage) لحفظ جلسة تسجيل الدخول وتفضيلاتك (مثل الوضع الليلي).
            هذه بيانات ضرورية لعمل المنصة ولا تُستخدم للتتبع الإعلاني.
          </p>

          <h2>4. الأمان</h2>
          <p>
            تُخزَّن كلمات المرور مشفّرة (bcrypt) ولا يمكن استرجاعها كنص صريح. تُطبَّق عزل البيانات بين
            المؤسسات (Multi-tenancy) وضوابط صلاحيات صارمة لحماية وصولك.
          </p>

          <h2>5. حقوق المستخدم</h2>
          <p>
            يحق لك الاطلاع على بياناتك وتصحيحها أو طلب حذف حسابك عبر التواصل مع إدارة مؤسستك. عند حذف
            الحساب، تُحذف بياناتك الشخصية المرتبطة به وفقاً للسياسات المعمول بها.
          </p>

          <div className="legal-page__footer">
            <Link to="/terms">شروط الاستخدام</Link>
            <Link to="/login">العودة لتسجيل الدخول</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
