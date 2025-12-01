export function renewalReminderEmail({ name, subscriptionName, renewalDate }: { name: string; subscriptionName: string; renewalDate: string }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #2563eb;">SubscriptionSentry Renewal Reminder</h2>
      <p>Hi ${name},</p>
      <p>This is a reminder that your <strong>${subscriptionName}</strong> subscription will renew on <strong>${new Date(renewalDate).toLocaleDateString()}</strong>.</p>
      <p>If you wish to manage or cancel your subscription, please log in to your dashboard.</p>
      <br />
      <p style="color: #888; font-size: 12px;">Thank you for using SubscriptionSentry!</p>
    </div>
  `;
} 