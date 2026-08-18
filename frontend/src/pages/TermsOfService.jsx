import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo';
import { useTheme } from '../context/ThemeContext';

// Public, static terms of service. Platform name follows the active branding.
const TermsOfService = () => {
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
          <h1 className="page-intro__title">شروط الاستخدام</h1>
          <p className="text-muted">آخر تحديث: 2026</p>

          <h2>1. قبول الشروط</h2>
          <p>
            باستخدامك منصة {name} فإنك توافق على هذه الشروط. إذا كنت لا توافق عليها، يُرجى عدم استخدام
            المنصة.
          </p>

          <h2>2. التزامات المستخدم</h2>
          <p>
            أنت مسؤول عن الحفاظ على سرية بيانات دخولك، وعن جميع الأنشطة التي تتم عبر حسابك. يجب تقديم
            معلومات صحيحة والالتزام بقواعد مؤسستك التعليمية.
          </p>

          <h2>3. الاستخدامات المحظورة</h2>
          <p>
            يُحظر استخدام المنصة لأي غرض غير قانوني، أو محاولة الوصول غير المصرّح به إلى حسابات أو
            بيانات الآخرين، أو رفع محتوى ضار أو مخالف، أو تعطيل عمل الخدمة.
          </p>

          <h2>4. الملكية الفكرية</h2>
          <p>
            يبقى المحتوى التعليمي ملكاً لمنشئيه أو لمؤسستك. لا يجوز إعادة نشر المحتوى أو توزيعه دون إذن.
          </p>

          <h2>5. إخلاء المسؤولية</h2>
          <p>
            تُقدَّم المنصة «كما هي» دون ضمانات صريحة أو ضمنية. لا نتحمل المسؤولية عن أي أضرار غير مباشرة
            ناتجة عن استخدام الخدمة إلى الحد الذي يسمح به القانون.
          </p>

          <div className="legal-page__footer">
            <Link to="/privacy">سياسة الخصوصية</Link>
            <Link to="/login">العودة لتسجيل الدخول</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
