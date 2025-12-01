/**
 * Formatting Utilities
 * 
 * Handles currency, date, and number formatting for US and UK markets
 */

export type Country = 'US' | 'UK';

/**
 * Gets currency symbol for a country
 */
export function getCurrencySymbol(country: Country, currency?: string): string {
  if (currency === 'GBP') return '£';
  if (currency === 'USD') return '$';
  return country === 'UK' ? '£' : '$';
}

/**
 * Formats a currency amount based on country/currency
 */
export function formatCurrency(
  amount: number,
  currency?: string,
  country?: Country
): string {
  const currencyCode = currency || (country === 'UK' ? 'GBP' : 'USD');
  const locale = currencyCode === 'GBP' ? 'en-GB' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a date based on country
 */
export function formatDate(date: Date | string, country?: Country): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = country === 'UK' ? 'en-GB' : 'en-US';
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date in short format (DD/MM/YYYY or MM/DD/YYYY)
 */
export function formatDateShort(date: Date | string, country?: Country): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = country === 'UK' ? 'en-GB' : 'en-US';
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Formats a number with appropriate thousand separators
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  country?: Country
): string {
  const locale = country === 'UK' ? 'en-GB' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Detects country from currency
 */
export function getCountryFromCurrency(currency?: string): Country {
  if (currency === 'GBP') return 'UK';
  return 'US';
}

/**
 * Formats a relative date (e.g., "3 days ago", "in 5 days")
 */
export function formatRelativeDate(date: Date | string, country?: Country): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

