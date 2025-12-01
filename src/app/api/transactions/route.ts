import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const transactionSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank account ID is required'),
  subscriptionId: z.string().optional(),
  amount: z.number(),
  date: z.string().or(z.date()),
  description: z.string().optional(),
  merchant: z.string().optional(),
});

// GET - Fetch all transactions for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const bankAccountId = searchParams.get('bankAccountId');

    const where: any = {
      userId: user.id,
    };

    if (bankAccountId) {
      where.bankAccountId = bankAccountId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        bankAccount: true,
        subscription: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST - Create a new transaction (manual entry or from Plaid)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = transactionSchema.parse(body);

    // Verify bank account belongs to user
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: data.bankAccountId,
        userId: user.id,
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // If subscriptionId is provided, verify it belongs to user
    if (data.subscriptionId) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          id: data.subscriptionId,
          userId: user.id,
        },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        );
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        bankAccountId: data.bankAccountId,
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        date: new Date(data.date),
        description: data.description,
        merchant: data.merchant,
      },
      include: {
        bankAccount: true,
        subscription: true,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

