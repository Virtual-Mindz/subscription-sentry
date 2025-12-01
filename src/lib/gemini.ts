import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model name to use - gemini-2.5-flash (stable model from official Gemini API documentation)
// This is the correct stable model name that works with the current SDK version
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * List available models (for debugging)
 */
export async function listAvailableModels() {
  try {
    // Note: listModels might not be available in all SDK versions
    // This is for debugging purposes
    console.log('Using model:', MODEL_NAME);
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);
    return MODEL_NAME;
  } catch (error) {
    console.error('Cannot list models:', error);
    return MODEL_NAME;
  }
}

export interface SubscriptionData {
  id: string;
  name: string;
  amount: number;
  renewalDate: Date;
  merchant?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionData {
  id: string;
  amount: number;
  date: Date;
  merchant?: string | null;
  description?: string | null;
  subscriptionId?: string | null;
}

export interface AIAnalysis {
  spendingPattern: {
    totalMonthly: number;
    totalYearly: number;
    categoryBreakdown: Record<string, number>;
    trend: 'increasing' | 'decreasing' | 'stable';
    insights: string[];
  };
  unusedSubscriptions: Array<{
    subscriptionId: string;
    name: string;
    amount: number;
    daysSinceLastTransaction: number;
    reasoning: string;
  }>;
  downgradeOpportunities: Array<{
    subscriptionId: string;
    name: string;
    currentAmount: number;
    suggestedAmount: number;
    savings: number;
    reasoning: string;
  }>;
  duplicateServices: Array<{
    serviceName: string;
    subscriptions: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
    totalWaste: number;
    recommendation: string;
  }>;
  annualVsMonthlySavings: Array<{
    subscriptionId: string;
    name: string;
    monthlyAmount: number;
    annualAmount: number;
    savings: number;
    savingsPercentage: number;
  }>;
}

export interface AIRecommendation {
  id: string;
  type: 'cost-cutting' | 'plan-alternative' | 'bundle' | 'trial-warning' | 'price-alert';
  title: string;
  description: string;
  subscriptionId?: string;
  impact: {
    type: 'savings' | 'improvement' | 'efficiency';
    value: number;
    period: 'monthly' | 'yearly' | 'one-time';
  };
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionText?: string;
  reasoning: string[];
  alternatives?: Array<{
    name: string;
    price: number;
    features: string[];
    pros: string[];
    cons: string[];
    savings: number;
  }>;
  cancellationSteps?: string[];
  supportTemplate?: string;
}

/**
 * Analyze spending patterns using Gemini AI
 */
export async function analyzeSpendingPatterns(
  subscriptions: SubscriptionData[],
  transactions: TransactionData[]
): Promise<AIAnalysis> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You are a financial AI assistant analyzing subscription spending patterns. Analyze the following data and provide a comprehensive JSON response.

Subscriptions:
${JSON.stringify(subscriptions.map(s => ({
  id: s.id,
  name: s.name,
  amount: s.amount,
  merchant: s.merchant,
  renewalDate: s.renewalDate.toISOString(),
  status: s.status
})), null, 2)}

Transactions (last 12 months):
${JSON.stringify(transactions.map(t => ({
  id: t.id,
  amount: t.amount,
  date: t.date.toISOString(),
  merchant: t.merchant,
  description: t.description,
  subscriptionId: t.subscriptionId
})), null, 2)}

Provide a detailed analysis in this exact JSON format:
{
  "spendingPattern": {
    "totalMonthly": number,
    "totalYearly": number,
    "categoryBreakdown": { "category": amount },
    "trend": "increasing" | "decreasing" | "stable",
    "insights": ["insight1", "insight2"]
  },
  "unusedSubscriptions": [
    {
      "subscriptionId": "id",
      "name": "name",
      "amount": number,
      "daysSinceLastTransaction": number,
      "reasoning": "why it's unused"
    }
  ],
  "downgradeOpportunities": [
    {
      "subscriptionId": "id",
      "name": "name",
      "currentAmount": number,
      "suggestedAmount": number,
      "savings": number,
      "reasoning": "why downgrade makes sense"
    }
  ],
  "duplicateServices": [
    {
      "serviceName": "service name",
      "subscriptions": [{"id": "id", "name": "name", "amount": number}],
      "totalWaste": number,
      "recommendation": "what to do"
    }
  ],
  "annualVsMonthlySavings": [
    {
      "subscriptionId": "id",
      "name": "name",
      "monthlyAmount": number,
      "annualAmount": number,
      "savings": number,
      "savingsPercentage": number
    }
  ]
}

Focus on:
1. Unused subscriptions: If no transactions in 60+ days, mark as unused
2. Duplicates: Identify services with similar names/merchants
3. Annual savings: Calculate if switching to annual would save money (typically 10-20% discount)
4. Downgrade opportunities: Identify overpriced plans with lower usage

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanedText);
    
    return analysis;
  } catch (error: any) {
    console.error('Error analyzing spending patterns:', error);
    console.error('Model used:', MODEL_NAME);
    console.error('Error details:', error?.message || error);
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      console.error('⚠️ Model not found. Check API key and model name.');
    }
    // Return fallback analysis
    return getFallbackAnalysis(subscriptions, transactions);
  }
}

/**
 * Generate smart recommendations using Gemini AI
 */
export async function generateSmartRecommendations(
  subscriptions: SubscriptionData[],
  transactions: TransactionData[],
  analysis: AIAnalysis
): Promise<AIRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You are a financial AI assistant providing personalized subscription recommendations. Based on the analysis, generate actionable recommendations.

Analysis Summary:
${JSON.stringify({
  totalMonthly: analysis.spendingPattern.totalMonthly,
  unusedCount: analysis.unusedSubscriptions.length,
  duplicateCount: analysis.duplicateServices.length,
  potentialSavings: analysis.annualVsMonthlySavings.reduce((sum, s) => sum + s.savings, 0)
}, null, 2)}

Subscriptions:
${JSON.stringify(subscriptions.map(s => ({
  id: s.id,
  name: s.name,
  amount: s.amount,
  merchant: s.merchant,
  renewalDate: s.renewalDate.toISOString()
})), null, 2)}

Provide recommendations in this exact JSON format:
[
  {
    "id": "unique-id",
    "type": "cost-cutting" | "plan-alternative" | "bundle" | "trial-warning" | "price-alert",
    "title": "Recommendation title",
    "description": "Detailed description",
    "subscriptionId": "subscription-id-if-applicable",
    "impact": {
      "type": "savings" | "improvement" | "efficiency",
      "value": number,
      "period": "monthly" | "yearly" | "one-time"
    },
    "confidence": number (0-100),
    "priority": "high" | "medium" | "low",
    "actionText": "Action button text",
    "reasoning": ["reason1", "reason2"],
    "alternatives": [optional - for plan-alternative type],
    "cancellationSteps": [optional - step-by-step guide],
    "supportTemplate": [optional - pre-filled support email template]
  }
]

Focus on:
1. Cost-cutting: Cancel unused subscriptions, downgrade plans
2. Plan alternatives: Suggest better/cheaper alternatives with real prices
3. Bundles: Identify services that could be bundled (e.g., Disney+/Hulu/ESPN+)
4. Trial warnings: Alert about upcoming trial expirations
5. Price alerts: Warn about recent price increases

Be specific with numbers and actionable. Return ONLY valid JSON array, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendations = JSON.parse(cleanedText);
    
    return Array.isArray(recommendations) ? recommendations : [];
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    console.error('Model used:', MODEL_NAME);
    console.error('Error details:', error?.message || error);
    return [];
  }
}

/**
 * Generate cancellation guide for a specific subscription
 */
export async function generateCancellationGuide(
  subscription: SubscriptionData
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `Generate a step-by-step cancellation guide for ${subscription.name} (${subscription.merchant || 'service'}).

Provide 5-7 specific, actionable steps that a user can follow to cancel this subscription. Be specific about:
- Where to find cancellation settings (website, app, account settings)
- What to look for (specific menu items, buttons)
- Any important notes (refund policies, cancellation timing, etc.)

Return as a JSON array of strings, each string being one step. Example:
["Step 1: Log into your account at [service].com", "Step 2: Navigate to Account Settings", ...]

Return ONLY the JSON array, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const steps = JSON.parse(cleanedText);
    
    return Array.isArray(steps) ? steps : [
      `Log into your ${subscription.name} account`,
      'Navigate to Account or Subscription settings',
      'Find the cancellation option',
      'Follow the prompts to confirm cancellation',
      'Save your cancellation confirmation'
    ];
  } catch (error: any) {
    console.error('Error generating cancellation guide:', error);
    console.error('Model used:', MODEL_NAME);
    console.error('Error details:', error?.message || error);
    return [
      `Log into your ${subscription.name} account`,
      'Navigate to Account or Subscription settings',
      'Find the cancellation option',
      'Follow the prompts to confirm cancellation'
    ];
  }
}

/**
 * Generate support email template
 */
export async function generateSupportTemplate(
  subscription: SubscriptionData,
  reason: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `Generate a professional, polite support email template for ${subscription.name} regarding: ${reason}

The email should:
- Be professional and courteous
- Clearly state the request (cancel subscription, change plan, etc.)
- Include relevant account information placeholders
- Be ready to send with minimal editing

Return ONLY the email body text, no subject line, no markdown formatting.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('Error generating support template:', error);
    console.error('Model used:', MODEL_NAME);
    console.error('Error details:', error?.message || error);
    return `Dear ${subscription.name} Support Team,

I am writing to request assistance with my subscription (Account: [YOUR_ACCOUNT_EMAIL]).

${reason}

Please let me know the next steps.

Thank you,
[YOUR_NAME]`;
  }
}

/**
 * Chat with AI about subscriptions
 */
export async function chatWithAI(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  subscriptions: SubscriptionData[],
  transactions: TransactionData[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const context = `You are a helpful AI assistant for SubscriptionSentry, a subscription management app. You have access to the user's subscription data.

User's Subscriptions:
${JSON.stringify(subscriptions.map(s => ({
  name: s.name,
  amount: s.amount,
  merchant: s.merchant,
  renewalDate: s.renewalDate.toISOString(),
  status: s.status
})), null, 2)}

Recent Transactions (last 3 months):
${JSON.stringify(transactions.slice(0, 10).map(t => ({
  amount: t.amount,
  date: t.date.toISOString(),
  merchant: t.merchant
})), null, 2)}

Conversation History:
${JSON.stringify(conversationHistory.slice(-5), null, 2)}

User's current message: ${message}

Provide a helpful, conversational response. You can:
- Answer questions about their subscriptions
- Provide cancellation guidance
- Suggest optimizations
- Calculate savings
- Help with subscription management

Be specific, actionable, and friendly. Use real numbers from their data.`;

  try {
    const result = await model.generateContent(context);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    console.error('Model used:', MODEL_NAME);
    console.error('Error details:', error?.message || error);
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      return "I apologize, but there's an issue with the AI service configuration. Please check the API key and model settings.";
    }
    return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
  }
}

/**
 * Fallback analysis when AI fails
 */
function getFallbackAnalysis(
  subscriptions: SubscriptionData[],
  transactions: TransactionData[]
): AIAnalysis {
  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const unusedSubscriptions = subscriptions
    .filter(sub => {
      const relatedTransactions = transactions.filter(
        t => t.subscriptionId === sub.id || 
        (t.merchant && sub.merchant && t.merchant.toLowerCase().includes(sub.merchant.toLowerCase()))
      );
      const lastTransaction = relatedTransactions
        .map(t => new Date(t.date))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      
      return !lastTransaction || lastTransaction < sixtyDaysAgo;
    })
    .map(sub => ({
      subscriptionId: sub.id,
      name: sub.name,
      amount: sub.amount,
      daysSinceLastTransaction: 60,
      reasoning: 'No transactions found in the last 60 days'
    }));

  return {
    spendingPattern: {
      totalMonthly,
      totalYearly: totalMonthly * 12,
      categoryBreakdown: {},
      trend: 'stable',
      insights: [`You're spending $${totalMonthly.toFixed(2)}/month on subscriptions`]
    },
    unusedSubscriptions,
    downgradeOpportunities: [],
    duplicateServices: [],
    annualVsMonthlySavings: []
  };
}


