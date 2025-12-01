import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateCancellationGuide } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: user.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const steps = await generateCancellationGuide({
      id: subscription.id,
      name: subscription.name,
      amount: subscription.amount,
      renewalDate: subscription.renewalDate,
      merchant: subscription.merchant,
      status: subscription.status,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('Error generating cancellation guide:', error);
    return NextResponse.json(
      { error: 'Failed to generate cancellation guide' },
      { status: 500 }
    );
  }
}


