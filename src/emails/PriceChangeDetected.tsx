import React from 'react';

interface PriceChangeDetectedProps {
  subscriptionName: string;
  merchant: string;
  oldAmount: number;
  newAmount: number;
  currency: string;
  changePercentage: number;
  changeDate: string;
  userName?: string;
  dashboardUrl: string;
}

export function PriceChangeDetectedEmail({
  subscriptionName,
  merchant,
  oldAmount,
  newAmount,
  currency,
  changePercentage,
  changeDate,
  userName,
  dashboardUrl,
}: PriceChangeDetectedProps) {
  const formattedOldAmount = new Intl.NumberFormat(
    currency === 'GBP' ? 'en-GB' : 'en-US',
    {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }
  ).format(oldAmount);

  const formattedNewAmount = new Intl.NumberFormat(
    currency === 'GBP' ? 'en-GB' : 'en-US',
    {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }
  ).format(newAmount);

  const changeAmount = newAmount - oldAmount;
  const formattedChangeAmount = new Intl.NumberFormat(
    currency === 'GBP' ? 'en-GB' : 'en-US',
    {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }
  ).format(Math.abs(changeAmount));

  const isIncrease = changeAmount > 0;
  const annualImpact = changeAmount * 12;

  const formattedDate = new Date(changeDate).toLocaleDateString(
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
        <div style={{ backgroundColor: isIncrease ? '#fef2f2' : '#f0fdf4', padding: '20px', borderRadius: '8px', marginBottom: '20px', borderLeft: `4px solid ${isIncrease ? '#ef4444' : '#10b981'}` }}>
          <h1 style={{ color: '#041024', margin: '0 0 10px 0' }}>
            {isIncrease ? '📈' : '📉'} Price Change Detected
          </h1>
          {userName && <p style={{ color: '#666', margin: '0' }}>Hi {userName},</p>}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 15px 0' }}>
            We've detected a price change for one of your subscriptions:
          </p>

          <div style={{ backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #3b82f6' }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#1e40af', fontSize: '18px' }}>{subscriptionName || merchant}</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e0e0e0' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Previous Price:</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{formattedOldAmount}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>New Price:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: isIncrease ? '#ef4444' : '#10b981' }}>
                {formattedNewAmount}
              </span>
            </div>

            <div style={{ marginTop: '15px', padding: '12px', backgroundColor: isIncrease ? '#fef2f2' : '#f0fdf4', borderRadius: '6px' }}>
              <p style={{ margin: '0', fontSize: '14px', color: isIncrease ? '#991b1b' : '#065f46' }}>
                <strong>
                  {isIncrease ? '↑' : '↓'} {formattedChangeAmount} ({Math.abs(changePercentage).toFixed(1)}%)
                </strong>
                {' '}per billing cycle
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: isIncrease ? '#991b1b' : '#065f46' }}>
                Annual impact: <strong>{isIncrease ? '+' : '-'}{new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(Math.abs(annualImpact))}</strong>
              </p>
            </div>

            <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Detected on: {formattedDate}
            </p>
          </div>

          {isIncrease && (
            <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
              <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
                💡 <strong>Consider:</strong> Review if this subscription still provides value at the new price, or look for alternatives.
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
          <p style={{ margin: '0' }}>
            Price changes are automatically detected from your transaction history. You can update subscription details or cancel if needed.
          </p>
        </div>
      </body>
    </html>
  );
}

