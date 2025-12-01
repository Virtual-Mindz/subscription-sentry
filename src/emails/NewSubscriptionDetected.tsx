import React from 'react';

interface NewSubscriptionDetectedProps {
  subscriptionName: string;
  merchant: string;
  amount: number;
  currency: string;
  interval: string;
  confidenceScore?: number;
  category?: string;
  userName?: string;
  dashboardUrl: string;
}

export function NewSubscriptionDetectedEmail({
  subscriptionName,
  merchant,
  amount,
  currency,
  interval,
  confidenceScore,
  category,
  userName,
  dashboardUrl,
}: NewSubscriptionDetectedProps) {
  const formattedAmount = new Intl.NumberFormat(
    currency === 'GBP' ? 'en-GB' : 'en-US',
    {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }
  ).format(amount);

  const confidencePercentage = confidenceScore
    ? Math.round(confidenceScore * 100)
    : null;

  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #10b981' }}>
          <h1 style={{ color: '#041024', margin: '0 0 10px 0' }}>✨ New Subscription Detected</h1>
          {userName && <p style={{ color: '#666', margin: '0' }}>Hi {userName},</p>}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 15px 0' }}>
            We've automatically detected a new recurring subscription from your transactions:
          </p>

          <div style={{ backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #3b82f6' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '18px' }}>{subscriptionName || merchant}</h2>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              <strong>Amount:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{formattedAmount}</span> per {interval}
            </p>
            {category && (
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                <strong>Category:</strong> {category}
              </p>
            )}
            {confidencePercentage !== null && (
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#6b7280' }}>
                <strong>Confidence:</strong> {confidencePercentage}% (auto-detected)
              </p>
            )}
          </div>

          <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
            <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
              📝 <strong>Review this subscription:</strong> Verify the details are correct and update if needed.
            </p>
          </div>
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
            Review Subscription
          </a>
        </div>

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280' }}>
          <p style={{ margin: '0' }}>
            This subscription was automatically detected from your bank transactions. If this is incorrect, you can edit or delete it from your dashboard.
          </p>
        </div>
      </body>
    </html>
  );
}

