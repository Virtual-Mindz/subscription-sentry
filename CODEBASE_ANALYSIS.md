# Subscription Detection System - Codebase Analysis

## TASK 1: CURRENT STATE ANALYSIS

### 1. Database Schema Analysis (`prisma/schema.prisma`)

#### Subscription Model
**Current Fields:**
- `id` (String, UUID)
- `userId` (String, relation to User)
- `name` (String) - Subscription name
- `amount` (Float) - Subscription amount
- `renewalDate` (DateTime) - Next renewal date
- `merchant` (String, optional) - Merchant name
- `status` (String) - Status: active, cancelled, paused
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `transactions` (Relation to Transaction[])

**Missing Fields Needed:**
- ❌ `currency` (String) - To support USD ($) and GBP (£)
- ❌ `interval` (String) - monthly, weekly, yearly, etc.
- ❌ `confidenceScore` (Float) - For auto-detected subscriptions
- ❌ `detectedAt` (DateTime) - When subscription was auto-detected
- ❌ `category` (String) - Streaming, Software, Fitness, etc.
- ❌ `lastPaymentDate` (DateTime) - Last payment date
- ❌ `billingCycle` (String) - Day of month/week for billing

#### Transaction Model
**Current Fields:**
- `id` (String, UUID)
- `userId` (String, relation to User)
- `bankAccountId` (String, relation to BankAccount)
- `subscriptionId` (String, optional, relation to Subscription)
- `amount` (Float) - Transaction amount (negative for expenses)
- `date` (DateTime) - Transaction date
- `description` (String, optional) - Transaction description
- `merchant` (String, optional) - Merchant name
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Missing Fields Needed:**
- ❌ `currency` (String) - To support USD and GBP
- ❌ `normalizedMerchant` (String) - Normalized merchant name
- ❌ `category` (String) - Transaction category
- ❌ `isRecurring` (Boolean) - Flag for recurring transactions
- ❌ `confidenceScore` (Float) - Confidence in merchant matching

#### BankAccount Model
**Current Fields:**
- `id` (String, UUID)
- `userId` (String, relation to User)
- `plaidId` (String, unique) - Plaid account ID
- `name` (String, optional) - Account name
- `type` (String, optional) - Account type
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `transactions` (Relation to Transaction[])

**Missing Fields Needed:**
- ❌ `currency` (String) - Account currency (USD/GBP)
- ❌ `country` (String) - US or UK
- ❌ `lastSyncAt` (DateTime) - Last transaction sync time
- ❌ `accessToken` (String, encrypted) - Plaid access token storage

---

### 2. Subscription Features Analysis

#### Files in `/dashboard/subscriptions/`
✅ **`src/app/dashboard/subscriptions/page.tsx`** - Main subscriptions page
- Manual subscription creation form
- Subscription listing with filtering (active/cancelled/all)
- Category grouping (Streaming, Software, Fitness, Gaming, Other)
- Summary cards (active count, monthly/yearly spend)
- Edit/delete functionality via SubscriptionCard component

#### API Routes for Subscriptions
✅ **`src/app/api/subscriptions/route.ts`**
- `GET` - Fetch all subscriptions for user
- `POST` - Create new subscription (manual entry)

✅ **`src/app/api/subscriptions/[id]/route.ts`**
- `GET` - Fetch single subscription
- `PUT` - Update subscription
- `DELETE` - Delete subscription

#### Current Functionality Status
✅ **Working:**
- Manual subscription CRUD (Create, Read, Update, Delete)
- Subscription filtering by status
- Category-based grouping
- Summary statistics (monthly/yearly spend)
- Basic subscription detection from Plaid transactions
- Transaction-to-subscription matching (basic contains check)

❌ **Not Working/Missing:**
- CSV/statement upload
- Manual transaction entry
- Transaction history view in UI
- Subscription suggestions UI
- Confidence scoring display
- UK currency support (£)
- Enhanced merchant matching

---

### 3. Missing Features Checklist

#### Core Detection Features
- ❌ **CSV/Statement Upload Functionality**
  - No CSV upload endpoint
  - No file parsing logic
  - No UI for file upload

- ❌ **Transaction Parsing and Storage**
  - Basic transaction storage exists
  - No CSV parsing logic
  - No support for multiple CSV formats (Chase, Bank of America, Barclays, etc.)

- ❌ **Merchant Name Normalization Utility**
  - No normalization function
  - Merchant matching uses simple `contains` check
  - No fuzzy matching or alias handling

- ❌ **Known Merchants Database (US + UK)**
  - No merchant database
  - No category mapping
  - No merchant aliases (e.g., "NETFLIX.COM" → "Netflix")

- ❌ **Recurring Pattern Detection Algorithm**
  - Basic algorithm exists in `subscriptionDetection.ts`
  - Only detects monthly/weekly patterns
  - No yearly, bi-weekly, or irregular pattern detection
  - No confidence scoring
  - Requires minimum 3 transactions (too strict)

- ❌ **Auto-Subscription Detection from Transactions**
  - Basic detection exists but runs only after Plaid sync
  - No manual trigger
  - No UI to review detected subscriptions
  - No confidence scores

#### Integration Features
- ⚠️ **Plaid Integration** (Partially Complete)
  - ✅ Plaid Link setup exists
  - ✅ Token exchange works
  - ✅ Transaction sync works
  - ❌ Only supports US (country_codes: ['US'])
  - ❌ No UK support (needs 'GB' in country_codes)
  - ❌ No access token storage (security issue)
  - ❌ No scheduled sync

- ❌ **Email Notifications for Upcoming Bills**
  - Email infrastructure exists (`src/lib/email.ts`)
  - Notification system exists (`src/lib/notifications.ts`)
  - ❌ No scheduled job/cron for sending emails
  - ❌ No email templates for renewal reminders

- ❌ **Transaction Sync Functionality**
  - Manual sync exists via API
  - ❌ No scheduled/automatic sync
  - ❌ No sync status tracking
  - ❌ No error handling for failed syncs

---

## TASK 2: IMPLEMENTATION PLAN

### Phase 1 (Week 1): Core Detection Foundation

#### Priority 1: CSV Upload & Parsing
- [ ] Create CSV upload API endpoint (`/api/transactions/upload`)
- [ ] Build CSV parser supporting multiple formats:
  - US: Chase, Bank of America, Wells Fargo, Citi
  - UK: Barclays, HSBC, Lloyds, NatWest
- [ ] Create upload UI component
- [ ] Add file validation (size, format, encoding)
- [ ] Store parsed transactions in database

#### Priority 2: Merchant Normalization
- [ ] Create merchant normalization utility (`src/lib/merchantNormalization.ts`)
- [ ] Build known merchants database (100+ US + UK services)
- [ ] Implement fuzzy matching algorithm
- [ ] Add merchant aliases mapping
- [ ] Update transaction storage to include normalized merchant

#### Priority 3: Enhanced Recurring Detection
- [ ] Improve `detectSubscriptions` algorithm:
  - Support yearly, bi-weekly, quarterly patterns
  - Add confidence scoring (0-100)
  - Reduce minimum transaction requirement (2 instead of 3)
  - Handle irregular intervals (within tolerance)
- [ ] Add pattern analysis (variance detection)
- [ ] Add amount variance tolerance

#### Priority 4: Database Schema Updates
- [ ] Add missing fields to Subscription model
- [ ] Add missing fields to Transaction model
- [ ] Add missing fields to BankAccount model
- [ ] Create migration
- [ ] Update TypeScript types

---

### Phase 2 (Week 2): Integration & UI

#### Priority 1: Auto-Detection UI
- [ ] Create subscription suggestions page/component
- [ ] Show detected subscriptions with confidence scores
- [ ] Allow user to accept/reject suggestions
- [ ] Bulk accept/reject functionality

#### Priority 2: Transaction History View
- [ ] Create transactions page (`/dashboard/transactions`)
- [ ] Add filtering (date range, merchant, category)
- [ ] Add search functionality
- [ ] Show subscription associations
- [ ] Add export functionality

#### Priority 3: Enhanced Detection Integration
- [ ] Add manual detection trigger button
- [ ] Show detection progress/status
- [ ] Display detection results summary
- [ ] Add "Detect from Transactions" button

#### Priority 4: Confidence Scoring Display
- [ ] Add confidence badges to subscription cards
- [ ] Show confidence in suggestions UI
- [ ] Add tooltips explaining confidence scores

---

### Phase 3 (Week 3): Plaid Integration Enhancement

#### Priority 1: UK Support
- [ ] Update Plaid Link to support UK (`country_codes: ['US', 'GB']`)
- [ ] Test UK bank connections
- [ ] Handle UK-specific transaction formats
- [ ] Add UK currency support (£)

#### Priority 2: Access Token Storage
- [ ] Add encrypted access token storage to BankAccount
- [ ] Implement token encryption/decryption
- [ ] Update exchange-token endpoint to store tokens
- [ ] Add token refresh logic

#### Priority 3: Scheduled Sync
- [ ] Create sync job/cron endpoint
- [ ] Implement daily sync for all connected accounts
- [ ] Add sync status tracking
- [ ] Add error handling and retry logic
- [ ] Create sync history/logs

#### Priority 4: Multi-Account Support
- [ ] Update UI to show multiple bank accounts
- [ ] Add account selection in transactions view
- [ ] Add account management page
- [ ] Support disconnecting accounts

---

### Phase 4 (Week 4): Notifications & Polish

#### Priority 1: Email Notifications
- [ ] Create email notification cron job
- [ ] Build renewal reminder email template
- [ ] Add price change detection
- [ ] Create price change email template
- [ ] Add user notification preferences

#### Priority 2: Price Change Detection
- [ ] Track subscription price history
- [ ] Detect price increases/decreases
- [ ] Alert user on price changes
- [ ] Show price history in subscription details

#### Priority 3: Analytics Dashboard
- [ ] Enhance analytics page with:
  - Subscription trends over time
  - Category breakdown (pie chart)
  - Spending forecast
  - Savings opportunities
- [ ] Add UK currency formatting
- [ ] Add date format localization (US vs UK)

#### Priority 4: UK-Specific Formatting
- [ ] Add currency detection (USD vs GBP)
- [ ] Format amounts with correct currency symbol
- [ ] Support UK date formats (DD/MM/YYYY)
- [ ] Add timezone handling
- [ ] Update all currency displays

---

## TASK 3: RECOMMENDED STARTING POINT

### Recommended First Feature: CSV Upload & Parsing

**Why this first?**
1. Provides immediate value - users can import existing transactions
2. Foundation for all other detection features
3. Doesn't require external API setup
4. Can be tested immediately

**Implementation Steps:**
1. Update database schema (add currency fields)
2. Create CSV upload API endpoint
3. Build CSV parser for common formats
4. Create upload UI component
5. Add merchant normalization (basic version)
6. Store transactions with normalized merchants

**Next Feature:** Enhanced merchant normalization and known merchants database

---

## SUMMARY

### What You Have ✅
- Manual subscription CRUD
- Basic subscription detection algorithm
- Plaid integration (US only)
- Transaction storage
- Basic merchant matching
- Subscription UI with filtering
- Authentication (Clerk)
- Database (Prisma + Supabase)

### What's Missing ❌
- CSV/statement upload
- Merchant normalization
- Known merchants database
- Enhanced recurring detection
- UK market support
- Email notifications (automated)
- Transaction history UI
- Confidence scoring
- Multi-currency support

### Recommended Build Order
1. **CSV Upload** (Foundation)
2. **Merchant Normalization** (Core detection)
3. **Known Merchants Database** (Improves accuracy)
4. **Enhanced Detection Algorithm** (Better results)
5. **UK Support** (Market expansion)
6. **Notifications** (User engagement)

---

## NEXT STEPS

Would you like me to start building Phase 1, Feature 1 (CSV Upload & Parsing)? This will include:
- Database schema updates
- CSV upload API endpoint
- CSV parser for US + UK banks
- Upload UI component
- Basic merchant normalization

Let me know if you'd like to proceed!

