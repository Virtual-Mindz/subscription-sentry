import { useState } from 'react';
import { DetectedSubscription } from '@/lib/subscriptionDetection';

interface DuplicateDetectorProps {
  subscriptions: DetectedSubscription[];
  onResolveDuplicate: (subscriptionId: string, action: 'keep' | 'cancel' | 'merge') => void;
}

interface DuplicateGroup {
  id: string;
  subscriptions: DetectedSubscription[];
  similarityScore: number;
  confidence: 'high' | 'medium' | 'low';
  suggestedAction: 'merge' | 'cancel_one' | 'review';
  potentialSavings: number;
}

export default function DuplicateDetector({ subscriptions, onResolveDuplicate }: DuplicateDetectorProps) {
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Advanced duplicate detection using multiple algorithms
  const detectDuplicates = (subs: DetectedSubscription[]): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < subs.length; i++) {
      if (processed.has(subs[i].merchant)) continue;

      const similarSubs = [subs[i]];
      processed.add(subs[i].merchant);

      for (let j = i + 1; j < subs.length; j++) {
        if (processed.has(subs[j].merchant)) continue;

        const similarity = calculateAdvancedSimilarity(subs[i], subs[j]);
        if (similarity > 0.7) { // 70% similarity threshold
          similarSubs.push(subs[j]);
          processed.add(subs[j].merchant);
        }
      }

      if (similarSubs.length > 1) {
        const totalAmount = similarSubs.reduce((sum, sub) => sum + sub.amount, 0);
        const avgSimilarity = similarSubs.reduce((sum, sub, idx) => {
          if (idx === 0) return sum;
          return sum + calculateAdvancedSimilarity(similarSubs[0], sub);
        }, 0) / (similarSubs.length - 1);

        groups.push({
          id: `group-${i}`,
          subscriptions: similarSubs,
          similarityScore: avgSimilarity,
          confidence: avgSimilarity > 0.9 ? 'high' : avgSimilarity > 0.8 ? 'medium' : 'low',
          suggestedAction: avgSimilarity > 0.9 ? 'merge' : avgSimilarity > 0.8 ? 'cancel_one' : 'review',
          potentialSavings: totalAmount - similarSubs[0].amount // Keep one, cancel others
        });
      }
    }

    return groups.sort((a, b) => b.similarityScore - a.similarityScore);
  };

  // Advanced similarity calculation using multiple factors
  const calculateAdvancedSimilarity = (sub1: DetectedSubscription, sub2: DetectedSubscription): number => {
    let score = 0;
    let factors = 0;

    // 1. Merchant name similarity (40% weight)
    const nameSimilarity = calculateStringSimilarity(sub1.merchant, sub2.merchant);
    score += nameSimilarity * 0.4;
    factors += 0.4;

    // 2. Category similarity (20% weight)
    if (sub1.category === sub2.category) {
      score += 0.2;
    }
    factors += 0.2;

    // 3. Price similarity (20% weight)
    const priceDiff = Math.abs(sub1.amount - sub2.amount);
    const priceSimilarity = Math.max(0, 1 - (priceDiff / Math.max(sub1.amount, sub2.amount)));
    score += priceSimilarity * 0.2;
    factors += 0.2;

    // 4. Interval similarity (10% weight)
    if (sub1.interval === sub2.interval) {
      score += 0.1;
    }
    factors += 0.1;

    // 5. Usage pattern similarity (10% weight)
    if (sub1.usageFrequency === sub2.usageFrequency) {
      score += 0.1;
    }
    factors += 0.1;

    return score / factors;
  };

  // Levenshtein distance for string similarity
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const duplicateGroups = detectDuplicates(subscriptions);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'merge': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'cancel_one': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'review': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (duplicateGroups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Duplicates Found</h3>
          <p className="text-gray-600">Great job! No duplicate subscriptions were detected in your portfolio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">🔍 Duplicate Detection Results</h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{duplicateGroups.length}</p>
              <p className="text-sm text-gray-600">Duplicate Groups</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(duplicateGroups.reduce((sum, group) => sum + group.potentialSavings, 0))}
              </p>
              <p className="text-sm text-gray-600">Potential Savings</p>
            </div>
          </div>
        </div>
        
        <p className="text-gray-600">
          Our AI detected {duplicateGroups.length} potential duplicate subscription groups. 
          Review each group and take action to optimize your spending.
        </p>
      </div>

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {duplicateGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {group.subscriptions.length} Similar Subscriptions
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(group.confidence)}`}>
                    {group.confidence} confidence
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(group.suggestedAction)}`}>
                    {group.suggestedAction.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Similarity: {(group.similarityScore * 100).toFixed(1)}%</span>
                  <span>Potential Savings: {formatCurrency(group.potentialSavings)}/month</span>
                  <span>Category: {group.subscriptions[0].category}</span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedGroup(group);
                  setShowDetails(!showDetails);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {showDetails && selectedGroup?.id === group.id ? 'Hide Details' : 'View Details'}
              </button>
            </div>

            {/* Subscription List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.subscriptions.map((subscription, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{subscription.merchant}</h4>
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(subscription.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interval:</span>
                      <span className="font-medium text-gray-900 capitalize">{subscription.interval}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Usage:</span>
                      <span className={`font-medium ${
                        subscription.usageFrequency === 'high' ? 'text-green-600' :
                        subscription.usageFrequency === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {subscription.usageFrequency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Health:</span>
                      <span className={`font-medium ${
                        subscription.healthScore >= 80 ? 'text-green-600' :
                        subscription.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {subscription.healthScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Recommended Action:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {group.suggestedAction.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onResolveDuplicate(group.subscriptions[0].merchant, 'keep')}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                  >
                    Keep All
                  </button>
                  <button
                    onClick={() => onResolveDuplicate(group.subscriptions[0].merchant, 'cancel')}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                  >
                    Cancel Duplicates
                  </button>
                  <button
                    onClick={() => onResolveDuplicate(group.subscriptions[0].merchant, 'merge')}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                  >
                    Merge Accounts
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analysis Modal */}
      {selectedGroup && showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detailed Analysis: {selectedGroup.subscriptions.length} Similar Subscriptions
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Similarity Matrix */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Similarity Analysis</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Service</th>
                        {selectedGroup.subscriptions.map((_, index) => (
                          <th key={index} className="text-center py-2">#{index + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.subscriptions.map((sub1, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 font-medium">{sub1.merchant}</td>
                          {selectedGroup.subscriptions.map((sub2, j) => (
                            <td key={j} className="text-center py-2">
                              {i === j ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <span className={`font-medium ${
                                  calculateAdvancedSimilarity(sub1, sub2) > 0.9 ? 'text-green-600' :
                                  calculateAdvancedSimilarity(sub1, sub2) > 0.8 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {(calculateAdvancedSimilarity(sub1, sub2) * 100).toFixed(0)}%
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendation Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">AI Recommendation</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(selectedGroup.suggestedAction)}`}>
                      {selectedGroup.suggestedAction.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {(selectedGroup.similarityScore * 100).toFixed(1)}% confidence
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">
                    {selectedGroup.suggestedAction === 'merge' && 
                      'These subscriptions appear to be the same service with different account names. Consider merging them into a single account.'}
                    {selectedGroup.suggestedAction === 'cancel_one' && 
                      'These are likely duplicate subscriptions. Consider canceling one to save money.'}
                    {selectedGroup.suggestedAction === 'review' && 
                      'These subscriptions show some similarities but may be different services. Please review carefully before taking action.'}
                  </p>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Potential Monthly Savings:</strong> {formatCurrency(selectedGroup.potentialSavings)}</p>
                    <p><strong>Annual Impact:</strong> {formatCurrency(selectedGroup.potentialSavings * 12)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onResolveDuplicate(selectedGroup.subscriptions[0].merchant, 'cancel');
                    setShowDetails(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Duplicates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 