import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const subscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
  renewalDate: z.string().or(z.date()),
  merchant: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'paused']).default('active'),
});

// GET - Fetch all subscriptions for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      console.error('getCurrentUser returned null or no user.id');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { renewalDate: 'asc' },
    });

    // Calculate total monthly spend and most expensive subscription
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    const totalMonthlySpend = activeSubscriptions.reduce((sum, sub) => {
      let monthlyAmount = sub.amount;
      if (sub.interval === 'yearly') {
        monthlyAmount = sub.amount / 12;
      } else if (sub.interval === 'quarterly') {
        monthlyAmount = sub.amount / 3;
      } else if (sub.interval === 'bi-weekly') {
        monthlyAmount = (sub.amount * 26) / 12;
      } else if (sub.interval === 'weekly') {
        monthlyAmount = (sub.amount * 52) / 12;
      }
      return sum + monthlyAmount;
    }, 0);

    const mostExpensive = activeSubscriptions.length > 0
      ? activeSubscriptions.reduce((max, sub) => {
          const subMonthly = sub.interval === 'yearly' ? sub.amount / 12 :
                            sub.interval === 'quarterly' ? sub.amount / 3 :
                            sub.interval === 'bi-weekly' ? (sub.amount * 26) / 12 :
                            sub.interval === 'weekly' ? (sub.amount * 52) / 12 :
                            sub.amount;
          const maxMonthly = max.interval === 'yearly' ? max.amount / 12 :
                            max.interval === 'quarterly' ? max.amount / 3 :
                            max.interval === 'bi-weekly' ? (max.amount * 26) / 12 :
                            max.interval === 'weekly' ? (max.amount * 52) / 12 :
                            max.amount;
          return subMonthly > maxMonthly ? sub : max;
        })
      : null;

    // Calculate upcoming renewals (next 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = activeSubscriptions.filter(sub => {
      const renewalDate = new Date(sub.renewalDate);
      return renewalDate >= now && renewalDate <= sevenDaysFromNow;
    }).length;

    return NextResponse.json({
      subscriptions,
      stats: {
        totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
        totalYearlySpend: Math.round(totalMonthlySpend * 12 * 100) / 100,
        activeCount: activeSubscriptions.length,
        upcomingRenewals,
        mostExpensiveSubscription: mostExpensive ? {
          id: mostExpensive.id,
          name: mostExpensive.name,
          merchant: mostExpensive.merchant,
          amount: mostExpensive.amount,
          interval: mostExpensive.interval,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create a new subscription
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = subscriptionSchema.parse(body);

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        name: data.name,
        amount: data.amount,
        renewalDate: new Date(data.renewalDate),
        merchant: data.merchant,
        status: data.status,
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

