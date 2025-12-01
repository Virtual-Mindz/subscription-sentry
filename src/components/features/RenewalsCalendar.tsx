import { useState } from 'react';
import { DetectedSubscription } from '@/lib/subscriptionDetection';

interface RenewalsCalendarProps {
  subscriptions: DetectedSubscription[];
  onRenewalClick?: (subscription: DetectedSubscription) => void;
}

interface RenewalEvent {
  subscription: DetectedSubscription;
  date: Date;
  daysUntil: number;
  urgency: 'urgent' | 'soon' | 'upcoming';
  isOverdue: boolean;
}

export default function RenewalsCalendar({ subscriptions, onRenewalClick }: RenewalsCalendarProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'list'>('timeline');
  const [filterDays, setFilterDays] = useState<number>(30);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRenewalEvents = (): RenewalEvent[] => {
    const now = new Date();
    const events: RenewalEvent[] = [];

    subscriptions.forEach(subscription => {
      const renewalDate = new Date(subscription.nextRenewal);
      const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency: 'urgent' | 'soon' | 'upcoming';
      if (daysUntil <= 3) urgency = 'urgent';
      else if (daysUntil <= 7) urgency = 'soon';
      else urgency = 'upcoming';

      const isOverdue = daysUntil < 0;

      events.push({
        subscription,
        date: renewalDate,
        daysUntil,
        urgency,
        isOverdue
      });
    });

    return events
      .filter(event => event.daysUntil <= filterDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const getUrgencyColor = (urgency: string, isOverdue: boolean) => {
    if (isOverdue) return 'text-red-600 bg-red-50 border-red-200';
    switch (urgency) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'soon': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'upcoming': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string, isOverdue: boolean) => {
    if (isOverdue) return '🚨';
    switch (urgency) {
      case 'urgent': return '⚠️';
      case 'soon': return '⏰';
      case 'upcoming': return '📅';
      default: return '📅';
    }
  };

  const getDaysText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const renewalEvents = getRenewalEvents();

  const renderTimelineView = () => (
    <div className="space-y-4">
      {renewalEvents.map((event, index) => (
        <div
          key={`${event.subscription.merchant}-${event.date.toISOString()}`}
          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${getUrgencyColor(event.urgency, event.isOverdue)}`}
          onClick={() => onRenewalClick?.(event.subscription)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getUrgencyIcon(event.urgency, event.isOverdue)}</span>
              <div>
                <h4 className="font-semibold text-gray-900">{event.subscription.merchant}</h4>
                <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">{formatCurrency(event.subscription.amount)}</p>
              <p className={`text-sm font-medium ${
                event.isOverdue ? 'text-red-600' : 
                event.urgency === 'urgent' ? 'text-red-600' : 
                event.urgency === 'soon' ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {getDaysText(event.daysUntil)}
              </p>
            </div>
          </div>
        </div>
      ))}
      
      {renewalEvents.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500">No renewals in the next {filterDays} days</p>
        </div>
      )}
    </div>
  );

  const renderCalendarView = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayEvents = renewalEvents.filter(event => 
        event.date.getDate() === day && 
        event.date.getMonth() === currentMonth &&
        event.date.getFullYear() === currentYear
      );
      
      calendarDays.push({ day, date, events: dayEvents });
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayData, index) => (
            <div
              key={index}
              className={`min-h-[60px] p-1 border border-gray-100 ${
                dayData?.date && dayData.date.toDateString() === today.toDateString()
                  ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              {dayData ? (
                <div className="h-full">
                  <div className="text-xs text-gray-600 mb-1">{dayData.day}</div>
                  {dayData.events.map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={`text-xs p-1 rounded mb-1 cursor-pointer ${
                        event.isOverdue ? 'bg-red-100 text-red-700' :
                        event.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                        event.urgency === 'soon' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}
                      onClick={() => onRenewalClick?.(event.subscription)}
                      title={`${event.subscription.merchant} - ${formatCurrency(event.subscription.amount)}`}
                    >
                      {event.subscription.merchant.split(' ')[0]}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-2">
      {renewalEvents.map((event) => (
        <div
          key={`${event.subscription.merchant}-${event.date.toISOString()}`}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => onRenewalClick?.(event.subscription)}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{getUrgencyIcon(event.urgency, event.isOverdue)}</span>
            <div>
              <h4 className="font-medium text-gray-900">{event.subscription.merchant}</h4>
              <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">{formatCurrency(event.subscription.amount)}</p>
            <p className={`text-sm ${
              event.isOverdue ? 'text-red-600' : 
              event.urgency === 'urgent' ? 'text-red-600' : 
              event.urgency === 'soon' ? 'text-orange-600' : 'text-blue-600'
            }`}>
              {getDaysText(event.daysUntil)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const urgentCount = renewalEvents.filter(e => e.urgency === 'urgent' || e.isOverdue).length;
  const soonCount = renewalEvents.filter(e => e.urgency === 'soon').length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Renewals</h2>
          <p className="text-sm text-gray-600">Track your subscription renewals</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value={7}>Next 7 days</option>
            <option value={30}>Next 30 days</option>
            <option value={90}>Next 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-xl font-bold text-red-600">{urgentCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-sm text-gray-600">Soon</p>
              <p className="text-xl font-bold text-orange-600">{soonCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-bold text-blue-600">{renewalEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode('timeline')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'timeline' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'calendar' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          List
        </button>
      </div>

      {/* Content */}
      {viewMode === 'timeline' && renderTimelineView()}
      {viewMode === 'calendar' && renderCalendarView()}
      {viewMode === 'list' && renderListView()}
    </div>
  );
} 