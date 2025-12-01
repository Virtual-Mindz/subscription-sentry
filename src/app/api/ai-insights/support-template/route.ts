import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSupportTemplate } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId, reason } = body;

    if (!subscriptionId || !reason) {
      return NextResponse.json(
        { error: 'Subscription ID and reason are required' },
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

    const template = await generateSupportTemplate(
      {
        id: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        renewalDate: subscription.renewalDate,
        merchant: subscription.merchant,
        status: subscription.status,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
      reason
    );

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error generating support template:', error);
    return NextResponse.json(
      { error: 'Failed to generate support template' },
      { status: 500 }
    );
  }
}


