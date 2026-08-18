import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BsCheckCircleFill, BsXCircleFill } from 'react-icons/bs';
import api from '../utils/api';
import Loader from '../components/common/Loader';
import BrandLogo from '../components/common/BrandLogo';

// Public certificate-verification page (no authentication). Reachable from the
// QR code printed on every certificate: /certificates/verify/:certificateId.
const CertificateVerify = () => {
  const { certificateId } = useParams();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get(`/certificates/verify/${certificateId}`);
        if (active) setResult(response.data || { valid: false });
      } catch {
        if (active) setResult({ valid: false });
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [certificateId]);

  const formatDate = (value) => {
    try {
      return new Date(value).toLocaleDateString('ar');
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <section className="surface-card" style={{ width: 'min(480px, 100%)', textAlign: 'center' }}>
        <div className="d-flex justify-content-center mb-3">
          <BrandLogo />
        </div>

        {isLoading ? (
          <Loader variant="section" />
        ) : result?.valid ? (
          <>
            <div style={{ color: 'var(--dj-success)', marginBottom: 8 }}>
              <BsCheckCircleFill size={54} />
            </div>
            <h1 style={{ fontSize: '1.4rem' }}>شهادة موثّقة</h1>
            <p className="text-muted mb-4">هذه الشهادة صحيحة وصادرة عن المنصة.</p>

            <div className="d-flex flex-column gap-2" style={{ textAlign: 'start' }}>
              <div className="d-flex justify-content-between">
                <span className="text-muted">الطالب</span>
                <strong>{result.studentName}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">الكورس</span>
                <strong>{result.courseName}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">تاريخ الإصدار</span>
                <strong>{formatDate(result.issueDate)}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">رقم الشهادة</span>
                <strong>{result.certificateId}</strong>
              </div>
            </div>
          </>
        ) : result?.status && result.status !== 'rejected' ? (
          <>
            <div style={{ color: 'var(--dj-secondary)', marginBottom: 8 }}>
              <BsXCircleFill size={54} />
            </div>
            <h1 style={{ fontSize: '1.4rem' }}>الشهادة قيد الإصدار</h1>
            <p className="text-muted mb-0">
              هذه الشهادة موجودة ولكنها لم تُعتمد نهائياً بعد. يُرجى المحاولة لاحقاً بعد اكتمال المراجعة.
            </p>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--dj-danger)', marginBottom: 8 }}>
              <BsXCircleFill size={54} />
            </div>
            <h1 style={{ fontSize: '1.4rem' }}>
              {result?.status === 'rejected' ? 'الشهادة غير معتمدة' : 'شهادة غير صالحة'}
            </h1>
            <p className="text-muted mb-0">
              {result?.status === 'rejected'
                ? 'لم تتم الموافقة على هذه الشهادة.'
                : 'تعذّر التحقق من هذه الشهادة. قد تكون غير موجودة أو تم إلغاؤها.'}
            </p>
          </>
        )}
      </section>
    </div>
  );
};

export default CertificateVerify;
