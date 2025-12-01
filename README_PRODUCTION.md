# Production Deployment Quick Start

## 🚀 Deployment Workflow: GitHub → Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Set environment variables (see below)
5. Click **"Deploy"**

**That's it!** Every future push to `main` will auto-deploy. 🎉

### Alternative: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 📋 Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk production key (pk_live_...)
- `CLERK_SECRET_KEY` - Clerk production secret (sk_live_...)
- `PLAID_CLIENT_ID_US` - Plaid US client ID
- `PLAID_SECRET_US` - Plaid US secret
- `PLAID_ENV` - Set to `production`
- `ENCRYPTION_KEY` - 32+ character encryption key
- `NEXT_PUBLIC_APP_URL` - Your production domain (https://...)
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - Verified sender email
- `GEMINI_API_KEY` - Google Gemini API key
- `CRON_SECRET` - Random secret for cron security
- `NODE_ENV` - Set to `production`

## 🔧 Database Setup

1. **Create Production Database**
   - **Easiest Options:**
     - **Vercel Postgres** (if using Vercel): Storage → Create Database → Postgres
     - **Supabase** (free tier): https://supabase.com → New Project
     - **Railway** (simple): https://railway.app → New → PostgreSQL
     - **Neon** (serverless): https://neon.tech → Create Project
   - See `DATABASE_SETUP_GUIDE.md` for detailed instructions
   - Get connection string (format: `postgresql://user:password@host:port/database?sslmode=require`)

2. **Set DATABASE_URL in Production**
   - Add `DATABASE_URL` environment variable in your hosting platform
   - Use the PostgreSQL connection string (NOT SQLite)

3. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

## ✅ Post-Deployment

1. Test sign-up/sign-in
2. Test Plaid connection
3. Test subscription detection
4. Monitor error logs

## 📚 Full Documentation

See `PRODUCTION_DEPLOYMENT.md` for complete guide.

