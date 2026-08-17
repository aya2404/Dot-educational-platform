import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BsCheckCircleFill, BsStars } from 'react-icons/bs';
import AppLayout from '../components/common/AppLayout';
import Loader from '../components/common/Loader';
import api from '../utils/api';

const PLANS = [
  {
    id: 'monthly',
    name: 'الخطة الشهرية',
    price: '$299',
    period: 'شهرياً',
    features: ['وصول كامل لجميع الكورسات', 'شهادات إتمام', 'دعم عبر المحادثة'],
  },
  {
    id: 'yearly',
    name: 'الخطة السنوية',
    price: '$2990',
    period: 'سنوياً',
    features: ['كل مزايا الخطة الشهرية', 'خصم شهرين مجاناً', 'أولوية في الدعم'],
    highlighted: true,
  },
];

const STATUS_LABEL = {
  active: 'نشط',
  canceled: 'ملغى',
  expired: 'منتهٍ',
  none: 'لا يوجد اشتراك',
};

const PricingPage = () => {
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadSubscription = async () => {
    try {
      const response = await api.get('/payments/subscription');
      setSubscription(response.data.data || { status: 'none' });
    } catch {
      setSubscription({ status: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
    const status = searchParams.get('status');
    if (status === 'success') setMessage({ type: 'success', text: 'تم الدفع بنجاح — سيتم تفعيل اشتراكك.' });
    else if (status === 'cancel') setMessage({ type: 'danger', text: 'تم إلغاء عملية الدفع.' });
  }, [searchParams]);

  const handleSubscribe = async (planId) => {
    setBusyPlan(planId);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.post('/payments/create-checkout', { plan: planId });
      if (response.data.url) {
        window.location.href = response.data.url; // redirect to Stripe Checkout
        return;
      }
      setMessage({ type: 'danger', text: 'تعذر بدء عملية الدفع' });
    } catch (requestError) {
      setMessage({
        type: 'danger',
        text: requestError.response?.data?.message || 'تعذر بدء عملية الدفع',
      });
    } finally {
      setBusyPlan('');
    }
  };

  const handleCancel = async () => {
    setBusyPlan('cancel');
    setMessage({ type: '', text: '' });
    try {
      await api.post('/payments/cancel');
      await loadSubscription();
      setMessage({ type: 'success', text: 'تم إلغاء الاشتراك' });
    } catch (requestError) {
      setMessage({ type: 'danger', text: requestError.response?.data?.message || 'تعذر إلغاء الاشتراك' });
    } finally {
      setBusyPlan('');
    }
  };

  const isActive = subscription?.status === 'active';

  return (
    <AppLayout>
      <div className="app-page">
        <section className="page-intro">
          <div>
            <p className="page-intro__eyebrow">الاشتراكات</p>
            <h1 className="page-intro__title">الخطط والأسعار</h1>
          </div>
        </section>

        {message.text ? <div className={`alert alert-${message.type}`}>{message.text}</div> : null}

        {isLoading ? (
          <Loader variant="section" card />
        ) : (
          <>
            {subscription && subscription.status !== 'none' ? (
              <section className="surface-card">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <strong>اشتراكك الحالي:</strong>{' '}
                    <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>
                      {STATUS_LABEL[subscription.status] || subscription.status}
                    </span>
                    {subscription.plan ? <span className="text-muted"> · {subscription.plan}</span> : null}
                  </div>
                  {isActive ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleCancel}
                      disabled={busyPlan === 'cancel'}
                    >
                      {busyPlan === 'cancel' ? 'جارٍ الإلغاء...' : 'إلغاء الاشتراك'}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            <div className="row g-4">
              {PLANS.map((plan) => (
                <div key={plan.id} className="col-12 col-md-6">
                  <section className="surface-card h-100">
                    <div className="section-heading">
                      <div>
                        <h2 className="section-heading__title">
                          {plan.highlighted ? <BsStars className="me-1" /> : null}
                          {plan.name}
                        </h2>
                      </div>
                    </div>

                    <div style={{ margin: '8px 0 16px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--dj-primary)' }}>
                        {plan.price}
                      </span>{' '}
                      <span className="text-muted">/ {plan.period}</span>
                    </div>

                    <ul className="list-unstyled d-flex flex-column gap-2 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="d-flex align-items-center gap-2">
                          <BsCheckCircleFill style={{ color: 'var(--dj-success)' }} size={16} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-outline-primary'} w-100`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={Boolean(busyPlan) || isActive}
                    >
                      {isActive
                        ? 'مشترك بالفعل'
                        : busyPlan === plan.id
                          ? 'جارٍ التحويل...'
                          : 'اشترك الآن'}
                    </button>
                  </section>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default PricingPage;
