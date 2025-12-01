import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { generateRenewalReminders } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscriptions, userEmail, userName } = body;

    if (!userId || !subscriptions || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate renewal reminders
    const reminders = generateRenewalReminders(subscriptions, userId, 7);

    if (reminders.length === 0) {
      return NextResponse.json(
        { message: 'No renewal reminders to send' },
        { status: 200 }
      );
    }

    // Group reminders by due date
    const urgentReminders = reminders.filter(r => r.severity === 'high');
    const regularReminders = reminders.filter(r => r.severity !== 'high');

    // Send email with renewal reminders
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">🔔 Subscription Renewal Reminders</h2>
        
        ${urgentReminders.length > 0 ? `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin: 0 0 12px 0;">⚠️ Urgent Renewals (Next 3 Days)</h3>
            ${urgentReminders.map(reminder => `
              <div style="margin-bottom: 12px; padding: 12px; background-color: white; border-radius: 6px;">
                <strong style="color: #dc2626;">${reminder.merchant}</strong><br>
                <span style="color: #6b7280;">Renews in ${reminder.dueDate ? Math.ceil((new Date(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 'unknown'} days</span><br>
                <span style="color: #059669; font-weight: bold;">$${reminder.amount?.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${regularReminders.length > 0 ? `
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px;">
            <h3 style="color: #0369a1; margin: 0 0 12px 0;">📅 Upcoming Renewals</h3>
            ${regularReminders.map(reminder => `
              <div style="margin-bottom: 12px; padding: 12px; background-color: white; border-radius: 6px;">
                <strong style="color: #1f2937;">${reminder.merchant}</strong><br>
                <span style="color: #6b7280;">Renews in ${reminder.dueDate ? Math.ceil((new Date(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 'unknown'} days</span><br>
                <span style="color: #059669; font-weight: bold;">$${reminder.amount?.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            💡 <strong>Tip:</strong> Review your subscriptions regularly to avoid paying for services you don't use.
          </p>
        </div>
        
        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View All Subscriptions
          </a>
        </div>
      </div>
    `;

    await sendEmail({
      to: userEmail,
      subject: `Renewal Reminders - ${urgentReminders.length > 0 ? 'Urgent' : 'Upcoming'} Subscriptions`,
      html: emailContent
    });

    return NextResponse.json(
      { 
        message: 'Renewal reminders sent successfully',
        sentCount: reminders.length,
        urgentCount: urgentReminders.length,
        regularCount: regularReminders.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending renewal reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send renewal reminders' },
      { status: 500 }
    );
  }
} 