# 🚀 Quick Deploy: GitHub → Vercel

## Your Workflow

```
Code → GitHub → Vercel → Live! ✨
```

## 3 Simple Steps

### 1️⃣ Push to GitHub

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2️⃣ Connect to Vercel

1. Go to: https://vercel.com
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Select your repository
5. Click **"Import"**

### 3️⃣ Set Environment Variables

Before deploying, add these in Vercel:

**Required:**
- `DATABASE_URL` - Your Supabase connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk production key
- `CLERK_SECRET_KEY` - Clerk production secret
- `PLAID_CLIENT_ID_US` - Plaid client ID
- `PLAID_SECRET_US` - Plaid secret
- `PLAID_ENV=production`
- `ENCRYPTION_KEY` - 32+ character key
- `NEXT_PUBLIC_APP_URL` - Your Vercel URL (or custom domain)
- `RESEND_API_KEY` - Your Resend key
- `RESEND_FROM_EMAIL` - Verified email
- `GEMINI_API_KEY` - Google Gemini key
- `CRON_SECRET` - Random secret
- `NODE_ENV=production`

**How to add:**
1. In Vercel project setup, click **"Environment Variables"**
2. Add each variable
3. Select **"Production"** environment
4. Click **"Save"**

### 4️⃣ Deploy!

Click **"Deploy"** and wait 2-3 minutes. Your app is live! 🎉

## ✅ After Deployment

1. **Test your site:** Visit the Vercel URL
2. **Update Clerk:** Add Vercel URL to Clerk redirect URLs
3. **Monitor:** Check Vercel dashboard for logs/errors

## 🔄 Future Updates

Just push to GitHub:

```bash
git push origin main
```

Vercel automatically deploys! No manual steps needed.

---

**Full Guide:** See `GITHUB_VERCEL_DEPLOYMENT.md` for detailed instructions.

