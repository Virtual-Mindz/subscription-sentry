import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPlaidClientForUser, getPlaidProducts } from '@/lib/plaidConfig';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get optional country from request body (for explicit country selection)
    const body = await request.json().catch(() => ({}));
    const requestedCountry = body.country as 'US' | 'UK' | undefined;

    // Get Plaid client and configuration for user
    const { client: plaidClient, countryCodes, region } = await getPlaidClientForUser(user.id);
    
    // Override region if explicitly requested
    const finalCountryCodes = requestedCountry 
      ? (requestedCountry === 'UK' ? ['GB'] : ['US'])
      : countryCodes;

    const products = getPlaidProducts(region);

    const createTokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'SubscriptionSentry',
      products,
      country_codes: finalCountryCodes as any,
      language: 'en',
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings'],
        },
      },
    });

    return NextResponse.json({
      link_token: createTokenResponse.data.link_token,
      region: requestedCountry || region,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create link token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}