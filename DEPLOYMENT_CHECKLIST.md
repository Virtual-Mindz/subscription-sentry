# Production Deployment Checklist

Use this checklist before deploying to production.

## ✅ Pre-Deployment

### Environment Variables
- [ ] All production environment variables set in hosting platform
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `NODE_ENV=production` is set
- [ ] `PLAID_ENV=production` (not sandbox)
- [ ] Clerk keys are production keys (`pk_live_`, `sk_live_`)
- [ ] `ENCRYPTION_KEY` is unique for production
- [ ] `NEXT_PUBLIC_APP_URL` is production domain (HTTPS)
- [ ] `CRON_SECRET` is set and random
- [ ] Run validation: `npm run validate-env`

### Database
- [ ] Production database created and accessible
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database connection tested
- [ ] Database backups configured

### Code Quality
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No console.log statements with sensitive data
- [ ] Error handling in place
- [ ] All API routes protected

### Security
- [ ] No test/sandbox API keys in production
- [ ] Encryption key is unique for production
- [ ] All secrets stored in environment variables (not code)
- [ ] CORS properly configured
- [ ] Security headers configured in `next.config.ts`
- [ ] Rate limiting considered for API routes

### Testing
- [ ] Tested locally with production build: `npm run start`
- [ ] All critical user flows tested
- [ ] Plaid connection tested (with production keys)
- [ ] Subscription detection tested
- [ ] UI displays correctly

## 🚀 Deployment

### Platform Setup
- [ ] Repository connected to hosting platform
- [ ] Environment variables configured
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start`
- [ ] Node.js version specified (20.x recommended)

### First Deployment
- [ ] Initial deployment successful
- [ ] Database migrations applied
- [ ] Application starts without errors
- [ ] Health check endpoint responds

## 🧪 Post-Deployment Verification

### Functional Tests
- [ ] User can sign up
- [ ] User can sign in
- [ ] User can connect bank account
- [ ] Transactions sync
- [ ] Subscriptions detected
- [ ] UI displays subscriptions
- [ ] Cancellation flow works
- [ ] AI insights generate

### Performance
- [ ] Page load times acceptable (< 3s)
- [ ] API response times acceptable (< 500ms)
- [ ] No memory leaks
- [ ] Database queries optimized

### Monitoring
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Application monitoring configured
- [ ] Log aggregation set up
- [ ] Alerts configured

## 📋 Post-Launch

### Week 1
- [ ] Monitor error logs daily
- [ ] Check user signups
- [ ] Monitor API performance
- [ ] Review user feedback
- [ ] Fix critical bugs immediately

### Ongoing
- [ ] Regular database backups verified
- [ ] Security updates applied
- [ ] Dependencies updated
- [ ] Performance monitoring
- [ ] User support channels active

---

**Quick Deploy Command**:
```bash
npm run pre-deploy && vercel --prod
```

