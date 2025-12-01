# GitHub → Vercel Deployment Guide

## 🎯 Your Workflow: Push to GitHub → Auto-Deploy to Vercel

This is the simplest deployment workflow! Here's how it works:

```
Your Code → Push to GitHub → Vercel Auto-Deploys → Live Site ✨
```

## 📋 Step-by-Step Setup

### Step 1: Push Your Code to GitHub

**If you haven't already:**

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for production deployment"

# Create GitHub repository
# Go to: https://github.com/new
# Create a new repository (e.g., "subscription-sentry")

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**If you already have a GitHub repo:**

```bash
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Connect GitHub to Vercel

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Sign up / Log in (use GitHub account for easiest setup)

2. **Import Your Project**
   - Click **"Add New..."** → **"Project"**
   - Click **"Import Git Repository"**
   - Select your GitHub repository
   - Click **"Import"**

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Set Environment Variables**
   - Before deploying, click **"Environment Variables"**
   - Add all your production variables:
     ```
     DATABASE_URL=postgresql://postgres.fsjnxfopzduvlwgenqgw:Autumn%2322AAPra@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
     CLERK_SECRET_KEY=sk_live_...
     PLAID_CLIENT_ID_US=...
     PLAID_SECRET_US=...
     PLAID_ENV=production
     ENCRYPTION_KEY=...
     NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
     RESEND_API_KEY=...
     RESEND_FROM_EMAIL=...
     GEMINI_API_KEY=...
     CRON_SECRET=...
     NODE_ENV=production
     ```
   - Make sure to select **"Production"** environment for all
   - Click **"Save"**

5. **Deploy!**
   - Click **"Deploy"**
   - Wait 2-3 minutes for build
   - Your app will be live! 🎉

### Step 3: Auto-Deploy on Every Push

**This happens automatically!** Once connected:

- Every push to `main` branch → Auto-deploys to production
- Every push to other branches → Creates preview deployment
- Pull requests → Creates preview deployment

## 🔧 Post-Deployment Setup

### 1. Set Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your custom domain (e.g., `yourdomain.com`)
3. Update `NEXT_PUBLIC_APP_URL` environment variable to match

### 2. Update Clerk Redirect URLs

1. Go to Clerk Dashboard: https://dashboard.clerk.com
2. Go to **Configure** → **Paths**
3. Add your Vercel URL:
   - **Sign-in redirect URL:** `https://your-app.vercel.app/dashboard/overview`
   - **Sign-up redirect URL:** `https://your-app.vercel.app/dashboard/overview`

### 3. Update Plaid Webhook URL (if using webhooks)

1. Go to Plaid Dashboard: https://dashboard.plaid.com
2. Set webhook URL to: `https://your-app.vercel.app/api/plaid/webhook`

## ✅ Deployment Checklist

Before first deployment:

- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected to GitHub
- [ ] All environment variables set in Vercel
- [ ] `DATABASE_URL` points to Supabase
- [ ] `PLAID_ENV=production` (not sandbox)
- [ ] Clerk keys are production keys (`pk_live_`, `sk_live_`)
- [ ] `NEXT_PUBLIC_APP_URL` set to Vercel URL (or custom domain)

After deployment:

- [ ] Build succeeded (check Vercel dashboard)
- [ ] Site is accessible
- [ ] Test sign-up/sign-in
- [ ] Test Plaid connection
- [ ] Test subscription detection
- [ ] Check error logs in Vercel dashboard

## 🔄 Future Deployments

**It's automatic!** Just:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Build your app
3. Deploy to production
4. Update your live site

## 📊 Monitoring Deployments

**Vercel Dashboard:**
- View all deployments
- See build logs
- Check deployment status
- View error logs
- Monitor performance

**Access:**
- Go to: https://vercel.com/dashboard
- Click on your project
- See deployment history

## 🆘 Troubleshooting

### Build Fails

1. **Check Build Logs**
   - Vercel Dashboard → Your Project → Deployments → Click failed deployment
   - Check error messages

2. **Common Issues:**
   - Missing environment variables → Add them in Vercel
   - TypeScript errors → Fix in code
   - Build command fails → Check `package.json` scripts
   - Database connection → Verify `DATABASE_URL`

### Environment Variables Not Working

1. **Check Variable Names**
   - Must match exactly (case-sensitive)
   - No extra spaces

2. **Check Environment**
   - Make sure variables are set for **Production**
   - Redeploy after adding variables

3. **Restart Deployment**
   - Vercel Dashboard → Deployments → Click "..." → Redeploy

### Database Connection Issues

1. **Test Connection**
   ```bash
   npm run test-db
   ```

2. **Check Supabase**
   - Verify database is active
   - Check connection string is correct
   - Ensure SSL is enabled

## 🎯 Quick Reference

**Deploy Command:**
```bash
git push origin main
```

**Check Status:**
- Vercel Dashboard: https://vercel.com/dashboard

**View Logs:**
- Vercel Dashboard → Project → Deployments → Click deployment → Logs

**Redeploy:**
- Vercel Dashboard → Deployments → Click "..." → Redeploy

---

## 🚀 Summary

1. **Push to GitHub** → Your code is in GitHub
2. **Connect to Vercel** → Import GitHub repo
3. **Set Environment Variables** → Add all production variables
4. **Deploy** → Click deploy button
5. **Auto-Deploy** → Every future push auto-deploys!

**That's it!** Your app will be live and automatically update on every push. 🎉

