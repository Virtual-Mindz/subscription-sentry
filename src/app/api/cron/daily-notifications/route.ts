/**
 * Daily Notifications Cron Job
 * 
 * This endpoint runs daily to check for upcoming bills and price changes
 * Configure in Vercel Cron or your hosting platform
 * 
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-notifications",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllNotificationChecks } from '@/lib/notificationChecker';

// Optional: Add a secret token for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all notification checks
    const results = await runAllNotificationChecks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        upcomingBillsSent: results.upcomingBills,
        priceChangesSent: results.priceChanges,
      },
    });
  } catch (error) {
    console.error('Error in daily notifications cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for platforms that require it
export async function POST(request: NextRequest) {
  return GET(request);
}

