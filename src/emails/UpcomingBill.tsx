import React from 'react';

interface UpcomingBillProps {
  subscriptionName: string;
  merchant: string;
  amount: number;
  currency: string;
  renewalDate: string;
  daysUntilRenewal: number;
  userName?: string;
  dashboardUrl: string;
}

export function UpcomingBillEmail({
  subscriptionName,
  merchant,
  amount,
  currency,
  renewalDate,
  daysUntilRenewal,
  userName,
  dashboardUrl,
}: UpcomingBillProps) {
  const currencySymbol = currency === 'GBP' ? '£' : '$';
  const formattedAmount = new Intl.NumberFormat(
    currency === 'GBP' ? 'en-GB' : 'en-US',
    {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }
  ).format(amount);

  const formattedDate = new Date(renewalDate).toLocaleDateString(
    currency === 'GBP' ? 'en-GB' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h1 style={{ color: '#041024', margin: '0 0 10px 0' }}>🔔 Upcoming Subscription Renewal</h1>
          {userName && <p style={{ color: '#666', margin: '0' }}>Hi {userName},</p>}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 15px 0' }}>
            Your subscription will renew in <strong>{daysUntilRenewal} {daysUntilRenewal === 1 ? 'day' : 'days'}</strong>.
          </p>

          <div style={{ backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #3b82f6' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '18px' }}>{subscriptionName || merchant}</h2>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              <strong>Amount:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{formattedAmount}</span>
            </p>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              <strong>Renewal Date:</strong> {formattedDate}
            </p>
          </div>

          {daysUntilRenewal <= 3 && (
            <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
                ⚠️ <strong>Renewal is coming soon!</strong> Review your subscription to ensure you want to continue.
              </p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a
            href={dashboardUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#ff8b3d',
              color: '#041024',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            View Subscription
          </a>
        </div>

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280' }}>
          <p style={{ margin: '0 0 5px 0' }}>
            💡 <strong>Tip:</strong> Review your subscriptions regularly to avoid paying for services you don't use.
          </p>
          <p style={{ margin: '5px 0 0 0' }}>
            You're receiving this email because you have renewal reminders enabled. You can manage your notification preferences in your dashboard.
          </p>
        </div>
      </body>
    </html>
  );
}

