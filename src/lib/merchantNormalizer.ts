/**
 * Merchant Name Normalization Utility
 * 
 * Cleans and normalizes raw merchant names from bank statements and Plaid
 * Handles payment processor prefixes, common patterns, and formatting issues
 */

/**
 * Payment processor patterns to remove
 * These appear before the actual merchant name in bank statements
 */
const PAYMENT_PROCESSOR_PATTERNS = [
  /^PAYPAL\s*\*\s*/i,
  /^GOOGLE\s*\*\s*/i,
  /^APPLE\.COM\/BILL\s*/i,
  /^APPLE\s*\*\s*/i,
  /^SQ\s*\*\s*/i, // Square
  /^STRIPE\s*\*\s*/i,
  /^AMZN\s*\.COM\/BILL\s*/i,
  /^AMZN\s*\*\s*/i,
  /^MICROSOFT\s*\*\s*/i,
  /^MSFT\s*\*\s*/i,
  /^AMAZON\s*\*\s*/i,
  /^GOOGLE\s*PAY\s*/i,
  /^APPLE\s*PAY\s*/i,
  /^VENMO\s*/i,
  /^ZELLE\s*/i,
  /^CASH\s*APP\s*/i,
  /^SAMSUNG\s*PAY\s*/i,
];

/**
 * Common suffixes and prefixes to clean
 */
const CLEANUP_PATTERNS = [
  /\s+\*\s*$/g, // Trailing asterisks
  /\s+\*\s*/g, // Asterisks in middle
  /\s+/g, // Multiple spaces
  /^[\s\-_]+|[\s\-_]+$/g, // Leading/trailing dashes/underscores/spaces
  /\d{4,}/g, // Long number sequences (likely transaction IDs)
  /#\d+/g, // Hash followed by numbers
  /\([^)]*\)/g, // Parentheses content (often location codes)
  /\[[^\]]*\]/g, // Square brackets content
];

/**
 * Common abbreviations and replacements
 * Note: Removed invalid regex-breaking keys like '+', '*', and symbol-only entries
 */
const ABBREVIATIONS: Record<string, string> = {
  'inc': '',
  'llc': '',
  'ltd': '',
  'corp': '',
  'corporation': '',
  'company': '',
  'co': '',
  '&': 'and',
  '@': 'at',
};

/**
 * Normalizes a raw merchant name from bank statements or Plaid
 * 
 * @param rawName - The raw merchant name from the transaction
 * @returns Normalized merchant name
 * 
 * @example
 * normalizeMerchant("PAYPAL *NETFLIX.COM") // "netflix"
 * normalizeMerchant("GOOGLE *YOUTUBE PREMIUM") // "youtube premium"
 * normalizeMerchant("APPLE.COM/BILL APPLE MUSIC") // "apple music"
 * normalizeMerchant("SQ *STARBUCKS STORE 12345") // "starbucks store"
 */
export function normalizeMerchant(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return '';
  }

  let normalized = rawName.trim();

  // Remove payment processor prefixes
  for (const pattern of PAYMENT_PROCESSOR_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  // Remove common cleanup patterns
  for (const pattern of CLEANUP_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  // Replace abbreviations (skip invalid keys that could break regex)
  for (const [abbrev, replacement] of Object.entries(ABBREVIATIONS)) {
    // Skip empty keys, whitespace-only keys, or invalid regex-breaking keys
    if (!abbrev || abbrev.trim() === '' || /^[+*?^$\\[\]{}()|.]$/.test(abbrev)) {
      continue;
    }
    try {
      // Escape special regex characters except & and @ which we handle specially
      const escapedAbbrev = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedAbbrev}\\b`, 'gi');
      normalized = normalized.replace(regex, replacement);
    } catch (error) {
      // Skip if regex creation fails
      console.warn(`Skipping invalid abbreviation pattern: ${abbrev}`, error);
      continue;
    }
  }

  // Remove common location indicators
  normalized = normalized
    .replace(/\b(store|location|branch|shop)\s+\d+/gi, '')
    .replace(/\b\d+\s*(st|nd|rd|th)\s*(street|ave|avenue|road|rd|blvd|boulevard)/gi, '')
    .replace(/\b[A-Z]{2}\s+\d{5}\b/g, '') // State ZIP codes
    .replace(/\b\d{5}\b/g, ''); // Standalone 5-digit numbers (likely ZIP)

  // Clean up multiple spaces and trim
  normalized = normalized
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Remove leading/trailing special characters
  normalized = normalized.replace(/^[^\w]+|[^\w]+$/g, '');

  // If result is empty or too short, return original (lowercased)
  if (normalized.length < 2) {
    return rawName.trim().toLowerCase();
  }

  return normalized;
}

/**
 * Extracts potential merchant name from transaction description
 * Sometimes the merchant name is embedded in a longer description
 * 
 * @param description - Full transaction description
 * @returns Extracted merchant name
 */
export function extractMerchantFromDescription(description: string): string {
  if (!description || typeof description !== 'string') {
    return '';
  }

  // Common patterns where merchant name appears
  const patterns = [
    /^([A-Z\s&]+?)\s+\d/, // Merchant name followed by number
    /^([A-Z\s&]+?)\s+[A-Z]{2}\s+\d/, // Merchant name, state, ZIP
    /^([A-Z\s&]+?)\s*#/, // Merchant name followed by #
    /^([A-Z\s&]+?)\s+\d{2}\/\d{2}/, // Merchant name followed by date
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return normalizeMerchant(match[1]);
    }
  }

  // If no pattern matches, try normalizing the whole description
  return normalizeMerchant(description);
}

/**
 * Checks if a string looks like a payment processor prefix
 * Useful for detecting if normalization is needed
 * 
 * @param name - Merchant name to check
 * @returns True if it looks like a payment processor
 */
export function isPaymentProcessor(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const upperName = name.toUpperCase();
  return PAYMENT_PROCESSOR_PATTERNS.some(pattern => pattern.test(upperName));
}

