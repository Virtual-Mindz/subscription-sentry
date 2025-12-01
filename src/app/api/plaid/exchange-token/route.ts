import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPlaidClientForUser } from '@/lib/plaidConfig';
import { storeEncryptedAccessToken, updateLastSyncTime } from '@/lib/plaidHelpers';
import { generateSubscriptionsFromTransactions } from '@/lib/subscriptionGenerator';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicToken } = await request.json();

    if (!publicToken) {
      return NextResponse.json(
        { error: 'Public token is required' },
        { status: 400 }
      );
    }

    // Get Plaid client for user (detects country automatically)
    const { client: plaidClient, currency: defaultCurrency, region } = await getPlaidClientForUser(user.id);

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    
    // SECURITY: Never log the access token

    // Get account information
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const savedBankAccounts = [];
    const savedTransactions = [];

    // Save bank accounts to database and fetch transactions
    for (const account of accountsResponse.data.accounts) {
      // Check if bank account already exists
      const existing = await prisma.bankAccount.findUnique({
        where: { plaidId: account.account_id },
      });

      let bankAccount;
      if (existing) {
        bankAccount = existing;
        // Update existing account with encrypted token and item ID
        await storeEncryptedAccessToken(user.id, itemId, accessToken, region, account.balances.iso_currency_code || defaultCurrency);
        // Update other fields if needed
        await prisma.bankAccount.update({
          where: { id: bankAccount.id },
          data: {
            plaidItemId: itemId,
            name: account.name,
            type: account.type,
            currency: account.balances.iso_currency_code || defaultCurrency,
            country: region,
          },
        });
      } else {
        bankAccount = await prisma.bankAccount.create({
          data: {
            userId: user.id,
            plaidId: account.account_id,
            plaidItemId: itemId,
            name: account.name,
            type: account.type,
            currency: account.balances.iso_currency_code || defaultCurrency,
            country: region,
          },
        });
        
        // Store encrypted access token
        await storeEncryptedAccessToken(user.id, itemId, accessToken, region, account.balances.iso_currency_code || defaultCurrency);
      }

      savedBankAccounts.push(bankAccount);

      // Fetch transactions for this account (last 30 days)
      // Note: In Sandbox, transactions might not be available immediately
      // You may need to add test transactions in Plaid Dashboard first
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();

        // Format dates as YYYY-MM-DD (required by Plaid)
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`Fetching transactions for account ${account.account_id} from ${startDateStr} to ${endDateStr}`);

        // Try to fetch transactions - this might fail in Sandbox if no transactions exist
        let transactionsResponse;
        try {
          transactionsResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: startDateStr,
            end_date: endDateStr,
            // Removed account_ids - fetch all transactions for the item
          });
        } catch (plaidError: any) {
          // If it's a 400 error, it might mean no transactions exist or item needs initialization
          if (plaidError.response?.status === 400) {
            const errorDetails = plaidError.response?.data;
            console.warn(`Plaid transactions API returned 400 for account ${account.account_id}:`, errorDetails);
            
            // Check if it's because item needs to be initialized (common in Sandbox)
            if (errorDetails?.error_code === 'ITEM_LOGIN_REQUIRED' || 
                errorDetails?.error_code === 'PRODUCT_NOT_READY') {
              console.log('Item needs initialization or transactions product not ready. This is normal for new Sandbox items.');
              // Skip transactions for now - user can sync later
              continue;
            }
            
            // For other 400 errors, log and skip
            console.warn('Skipping transactions due to API error. Account is still saved.');
            continue;
          }
          throw plaidError; // Re-throw if it's not a 400 error
        }

        console.log(`Fetched ${transactionsResponse.data.transactions.length} transactions for account ${account.account_id}`);

        // Save transactions to database
        for (const plaidTx of transactionsResponse.data.transactions) {
          // Check if transaction already exists
          const existingTx = await prisma.transaction.findFirst({
            where: {
              userId: user.id,
              bankAccountId: bankAccount.id,
              amount: -Math.abs(plaidTx.amount),
              date: new Date(plaidTx.date),
              merchant: plaidTx.merchant_name || plaidTx.name,
            },
          });

          if (existingTx) continue;

          // Try to match with existing subscription
          let subscriptionId: string | undefined;
          if (plaidTx.merchant_name) {
            const subscription = await prisma.subscription.findFirst({
              where: {
                userId: user.id,
                merchant: {
                  contains: plaidTx.merchant_name,
                  mode: 'insensitive',
                },
                status: 'active',
              },
            });
            if (subscription) {
              subscriptionId = subscription.id;
            }
          }

          const transaction = await prisma.transaction.create({
            data: {
              userId: user.id,
              bankAccountId: bankAccount.id,
              subscriptionId: subscriptionId,
              amount: -Math.abs(plaidTx.amount), // Store as negative for expenses
              currency: account.balances.iso_currency_code || defaultCurrency,
              date: new Date(plaidTx.date),
              description: plaidTx.name,
              merchant: plaidTx.merchant_name || plaidTx.name,
            },
          });

          savedTransactions.push(transaction);
        }
        
        // Update last sync time
        await updateLastSyncTime(bankAccount.id);
        
        console.log(`Saved ${savedTransactions.length} transactions for account ${account.account_id} (user ${user.id})`);
      } catch (txError: any) {
        console.error('Error fetching transactions:', txError);
        // Log more details about the error
        if (txError.response?.data) {
          console.error('Plaid API error details:', JSON.stringify(txError.response.data, null, 2));
        }
        // Continue even if transaction fetch fails - accounts are still saved
        console.log(`Skipping transactions for account ${account.account_id}, but account is saved`);
      }
    }

    // Log total transactions saved across all accounts
    const totalTransactions = savedTransactions.length;
    console.log(`Plaid sync complete → ${totalTransactions} transactions saved for user ${user.id}`);

    // Auto-detect subscriptions from saved transactions
    if (savedTransactions.length > 0) {
      const recentTransactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
        orderBy: { date: 'desc' },
      });

      const transactionsForDetection = recentTransactions.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        bankAccountId: tx.bankAccountId,
        amount: tx.amount,
        date: tx.date.toISOString().split('T')[0],
        merchant: tx.merchant || '',
      }));

      // Auto-detect subscriptions using the enhanced generator
      try {
        const generated = await generateSubscriptionsFromTransactions(user.id, 24);
        console.log(`Subscription detection complete → ${generated.length} subscriptions detected for user ${user.id}`);
        const newSubscriptions = generated.filter(s => s.wasCreated).length;
        if (newSubscriptions > 0) {
          console.log(`  → ${newSubscriptions} new subscriptions created`);
        }
      } catch (error) {
        console.error('Error generating subscriptions:', error);
        // Continue even if subscription generation fails
      }
    }

    console.log(`Plaid connection complete: ${savedBankAccounts.length} accounts, ${savedTransactions.length} transactions saved`);

    return NextResponse.json({
      success: true,
      message: 'Bank account connected successfully',
      bankAccounts: savedBankAccounts.length,
      transactions: savedTransactions.length,
      subscriptionsDetected: savedTransactions.length > 0,
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to connect bank account' },
      { status: 500 }
    );
  }
} 