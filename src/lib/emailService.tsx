/**
 * Email Service
 * 
 * Handles sending transactional emails using Resend
 */

import { sendEmail } from './email';
import { render } from '@react-email/render';
import { UpcomingBillEmail } from '@/emails/UpcomingBill';
import { NewSubscriptionDetectedEmail } from '@/emails/NewSubscriptionDetected';
import { PriceChangeDetectedEmail } from '@/emails/PriceChangeDetected';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Sends an upcoming bill notification email
 */
export async function sendUpcomingBillEmail({
  to,
  subscriptionName,
  merchant,
  amount,
  currency,
  renewalDate,
  daysUntilRenewal,
  userName,
}: {
  to: string;
  subscriptionName: string;
  merchant: string;
  amount: number;
  currency: string;
  renewalDate: Date | string;
  daysUntilRenewal: number;
  userName?: string;
}) {
  try {
    const renewalDateStr = typeof renewalDate === 'string' ? renewalDate : renewalDate.toISOString();
    const dashboardUrl = `${APP_URL}/dashboard/subscriptions`;

    const html = await render(
      <UpcomingBillEmail
        subscriptionName={subscriptionName}
        merchant={merchant}
        amount={amount}
        currency={currency}
        renewalDate={renewalDateStr}
        daysUntilRenewal={daysUntilRenewal}
        userName={userName}
        dashboardUrl={dashboardUrl}
      />
    );

    await sendEmail({
      to,
      subject: `🔔 ${subscriptionName || merchant} renews in ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'day' : 'days'}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send upcoming bill email:', error);
    return { success: false, error };
  }
}

/**
 * Sends a new subscription detected email
 */
export async function sendNewSubscriptionDetectedEmail({
  to,
  subscriptionName,
  merchant,
  amount,
  currency,
  interval,
  confidenceScore,
  category,
  userName,
}: {
  to: string;
  subscriptionName: string;
  merchant: string;
  amount: number;
  currency: string;
  interval: string;
  confidenceScore?: number;
  category?: string;
  userName?: string;
}) {
  try {
    const dashboardUrl = `${APP_URL}/dashboard/subscriptions`;

    const html = await render(
      <NewSubscriptionDetectedEmail
        subscriptionName={subscriptionName}
        merchant={merchant}
        amount={amount}
        currency={currency}
        interval={interval}
        confidenceScore={confidenceScore}
        category={category}
        userName={userName}
        dashboardUrl={dashboardUrl}
      />
    );

    await sendEmail({
      to,
      subject: `✨ New subscription detected: ${subscriptionName || merchant}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send new subscription detected email:', error);
    return { success: false, error };
  }
}

/**
 * Sends a price change detected email
 */
export async function sendPriceChangeDetectedEmail({
  to,
  subscriptionName,
  merchant,
  oldAmount,
  newAmount,
  currency,
  changeDate,
  userName,
}: {
  to: string;
  subscriptionName: string;
  merchant: string;
  oldAmount: number;
  newAmount: number;
  currency: string;
  changeDate: Date | string;
  userName?: string;
}) {
  try {
    const changeAmount = newAmount - oldAmount;
    const changePercentage = (changeAmount / oldAmount) * 100;
    const changeDateStr = typeof changeDate === 'string' ? changeDate : changeDate.toISOString();
    const dashboardUrl = `${APP_URL}/dashboard/subscriptions`;

    const html = await render(
      <PriceChangeDetectedEmail
        subscriptionName={subscriptionName}
        merchant={merchant}
        oldAmount={oldAmount}
        newAmount={newAmount}
        currency={currency}
        changePercentage={changePercentage}
        changeDate={changeDateStr}
        userName={userName}
        dashboardUrl={dashboardUrl}
      />
    );

    const isIncrease = changeAmount > 0;
    const subject = `${isIncrease ? '📈' : '📉'} Price change: ${subscriptionName || merchant} ${isIncrease ? 'increased' : 'decreased'}`;

    await sendEmail({
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send price change detected email:', error);
    return { success: false, error };
  }
}

