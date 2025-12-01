'use client';
import { useState } from 'react';
import { NotificationPreferences, AlertRule } from '@/lib/notifications';

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    userId: 'demo-user-id',
    renewalReminders: true,
    priceIncreaseAlerts: true,
    spendingLimitAlerts: true,
    unusedSubscriptionWarnings: true,
    duplicateDetection: true,
    savingsOpportunities: true,
    emailNotifications: true,
    pushNotifications: false,
    reminderDays: 7,
    spendingLimit: 100
  });

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      userId: 'demo-user-id',
      type: 'spending_limit',
      condition: 'monthly_spending_exceeds',
      threshold: 100,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      userId: 'demo-user-id',
      type: 'price_increase',
      condition: 'price_increase_percentage',
      threshold: 10,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ]);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAlertRuleChange = (id: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const addAlertRule = () => {
    const newRule: AlertRule = {
      id: Date.now().toString(),
      userId: 'demo-user-id',
      type: 'spending_limit',
      condition: 'monthly_spending_exceeds',
      threshold: 50,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setAlertRules(prev => [...prev, newRule]);
  };

  const removeAlertRule = (id: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-1">Configure how and when you receive alerts</p>
      </div>

      {/* Notification Types */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Types</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Renewal Reminders</h3>
              <p className="text-sm text-gray-600">Get notified before subscriptions renew</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={preferences.reminderDays}
                onChange={(e) => handlePreferenceChange('reminderDays', parseInt(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={1}>1 day before</option>
                <option value={3}>3 days before</option>
                <option value={7}>1 week before</option>
                <option value={14}>2 weeks before</option>
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.renewalReminders}
                  onChange={(e) => handlePreferenceChange('renewalReminders', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Price Increase Alerts</h3>
              <p className="text-sm text-gray-600">Get notified when subscription prices change</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.priceIncreaseAlerts}
                onChange={(e) => handlePreferenceChange('priceIncreaseAlerts', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Spending Limit Alerts</h3>
              <p className="text-sm text-gray-600">Get notified when you exceed your spending limit</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={preferences.spendingLimit}
                onChange={(e) => handlePreferenceChange('spendingLimit', parseFloat(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1 w-20"
                placeholder="100"
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.spendingLimitAlerts}
                  onChange={(e) => handlePreferenceChange('spendingLimitAlerts', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Unused Subscription Warnings</h3>
              <p className="text-sm text-gray-600">Get notified about potentially unused subscriptions</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.unusedSubscriptionWarnings}
                onChange={(e) => handlePreferenceChange('unusedSubscriptionWarnings', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Duplicate Detection</h3>
              <p className="text-sm text-gray-600">Get notified about potential duplicate subscriptions</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.duplicateDetection}
                onChange={(e) => handlePreferenceChange('duplicateDetection', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Savings Opportunities</h3>
              <p className="text-sm text-gray-600">Get notified about potential savings opportunities</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.savingsOpportunities}
                onChange={(e) => handlePreferenceChange('savingsOpportunities', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable</span>
            </label>
          </div>
        </div>
      </div>

      {/* Delivery Methods */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Methods</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Push Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications in your browser</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.pushNotifications}
                onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable</span>
            </label>
          </div>
        </div>
      </div>

      {/* Custom Alert Rules */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Custom Alert Rules</h2>
          <button
            onClick={addAlertRule}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Add Rule
          </button>
        </div>
        
        <div className="space-y-4">
          {alertRules.map((rule) => (
            <div key={rule.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  {rule.type === 'spending_limit' ? 'Spending Limit' : 
                   rule.type === 'price_increase' ? 'Price Increase' : 
                   'Unused Subscription'} Alert
                </h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={(e) => handleAlertRuleChange(rule.id, { isActive: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  <button
                    onClick={() => removeAlertRule(rule.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={rule.condition}
                    onChange={(e) => handleAlertRuleChange(rule.id, { condition: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="monthly_spending_exceeds">Monthly spending exceeds</option>
                    <option value="price_increase_percentage">Price increase percentage</option>
                    <option value="unused_subscription_days">Unused subscription days</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    value={rule.threshold}
                    onChange={(e) => handleAlertRuleChange(rule.id, { threshold: parseFloat(e.target.value) })}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Save Settings
        </button>
      </div>
    </div>
  );
} 