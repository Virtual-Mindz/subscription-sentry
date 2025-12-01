# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables Setup

#### Required Environment Variables

Create a `.env.production` file or set these in your hosting platform (Vercel, Railway, etc.):

```env
# ============================================
# DATABASE (Production PostgreSQL)
# ============================================
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# ============================================
# AUTHENTICATION (Clerk - Production Keys)
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# ============================================
# PLAID CONFIGURATION (Production)
# ============================================
PLAID_CLIENT_ID_US=your_production_us_client_id
PLAID_SECRET_US=your_production_us_secret
PLAID_CLIENT_ID_EU=your_production_eu_client_id  # Optional
PLAID_SECRET_EU=your_production_eu_secret         # Optional
PLAID_ENV=production

# ============================================
# ENCRYPTION (CRITICAL - Generate New Key)
# ============================================
# Generate with: npx tsx scripts/generate-encryption-key.ts
# IMPORTANT: Use a DIFFERENT key than development
ENCRYPTION_KEY=your_32_character_production_key_here

# ============================================
# APPLICATION URL (Production Domain)
# ============================================
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# ============================================
# EMAIL SERVICE (Resend - Production)
# ============================================
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ============================================
# AI SERVICE (Google Gemini)
# ============================================
GEMINI_API_KEY=your_gemini_api_key_here

# ============================================
# CRON SECURITY (Generate Random String)
# ============================================
CRON_SECRET=your_random_production_secret_here

# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
```

### 2. Database Migration

#### Step 1: Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to production database
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate deploy
```

#### Step 2: Verify Database Connection

```bash
# Test connection
npx prisma db pull
```

### 3. Build Optimization

#### Update `next.config.ts` for Production

The config should include:
- Output optimization
- Image optimization
- Security headers
- Compression

### 4. Security Checklist

- [ ] All API keys are production keys (not test/sandbox)
- [ ] `ENCRYPTION_KEY` is unique for production
- [ ] `CRON_SECRET` is set and random
- [ ] Database uses SSL connection
- [ ] Clerk is using production keys
- [ ] Plaid is using production environment
- [ ] No console.log statements exposing sensitive data
- [ ] Error messages don't leak sensitive information

### 5. Pre-Deployment Testing

```bash
# Build the application
npm run build

# Test production build locally
npm run start

# Run linting
npm run lint

# Check for TypeScript errors
npx tsc --noEmit
```

### 6. Performance Optimization

- [ ] Enable Next.js Image Optimization
- [ ] Configure CDN for static assets
- [ ] Enable compression (gzip/brotli)
- [ ] Set up caching headers
- [ ] Optimize database queries (add indexes if needed)

## 📦 Deployment Platforms

### Vercel (Recommended for Next.js)

1. **Connect Repository**
   ```bash
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all production environment variables
   - Set for "Production" environment

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Custom Domain**
   - Settings → Domains
   - Add your custom domain
   - Update `NEXT_PUBLIC_APP_URL` to match

### Railway

1. **Create New Project**
   - Connect GitHub repository
   - Select PostgreSQL database

2. **Set Environment Variables**
   - Variables tab → Add all production variables

3. **Deploy**
   - Railway auto-deploys on push to main branch

### Other Platforms

- **Netlify**: Similar to Vercel, supports Next.js
- **AWS Amplify**: Full AWS integration
- **DigitalOcean App Platform**: Simple deployment
- **Render**: Easy PostgreSQL + Next.js setup

## 🔒 Security Hardening

### 1. API Route Protection

All API routes are protected by Clerk middleware. Verify:
- `/api/subscriptions` - ✅ Protected
- `/api/plaid/*` - ✅ Protected
- `/api/ai-insights` - ✅ Protected

### 2. Rate Limiting

Consider adding rate limiting for:
- Subscription detection API
- Plaid connection endpoints
- AI insights generation

### 3. CORS Configuration

Ensure CORS is properly configured in `next.config.ts`:
```typescript
headers: async () => [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
    ],
  },
],
```

### 4. Content Security Policy

Add CSP headers in `next.config.ts`:
```typescript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      },
    ],
  },
],
```

## 📊 Monitoring & Logging

### 1. Error Tracking

Set up error tracking service:
- **Sentry**: `npm install @sentry/nextjs`
- **LogRocket**: For session replay
- **Vercel Analytics**: Built-in analytics

### 2. Application Monitoring

- Monitor API response times
- Track subscription detection success rate
- Monitor database connection health
- Set up alerts for errors

### 3. Logging Strategy

- Use structured logging (JSON format)
- Log levels: ERROR, WARN, INFO
- Never log sensitive data (tokens, passwords)
- Use environment-based log levels

## 🧪 Post-Deployment Verification

### 1. Smoke Tests

```bash
# Test API endpoints
curl https://yourdomain.com/api/subscriptions

# Test authentication
# Visit https://yourdomain.com/dashboard
# Should redirect to sign-in if not authenticated
```

### 2. Functional Tests

- [ ] User can sign up/sign in
- [ ] User can connect bank account via Plaid
- [ ] Transactions sync correctly
- [ ] Subscriptions are detected
- [ ] UI displays subscriptions correctly
- [ ] Cancellation flow works
- [ ] AI insights generate correctly

### 3. Performance Tests

- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Images load efficiently

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      # Add deployment step for your platform
```

## 📝 Post-Deployment Tasks

1. **Monitor First 24 Hours**
   - Watch error logs
   - Monitor user signups
   - Check API performance

2. **Set Up Alerts**
   - Error rate > threshold
   - API response time > threshold
   - Database connection failures

3. **User Communication**
   - Announce launch
   - Provide support channels
   - Share documentation

4. **Backup Strategy**
   - Set up automated database backups
   - Test restore process
   - Document recovery procedures

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify SSL mode
   - Check firewall rules

2. **Plaid Connection Fails**
   - Verify production keys
   - Check `PLAID_ENV=production`
   - Verify webhook URLs

3. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies installed
   - Check Node.js version compatibility

4. **Environment Variables Not Loading**
   - Verify variable names match exactly
   - Check for typos
   - Ensure variables are set for correct environment

## 📚 Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Prisma Production Guide](https://www.prisma.io/docs/guides/deployment)
- [Clerk Production Setup](https://clerk.com/docs/deployments/overview)

---

**Last Updated**: $(date)
**Version**: 1.0.0

