# PostgreSQL Database Setup Guide for Production

## 🎯 Quick Options (Recommended)

### Option 1: Vercel Postgres (Easiest - if using Vercel)

**Steps:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create one)
3. Go to **Storage** tab → **Create Database**
4. Select **Postgres**
5. Choose a plan (Hobby is free for small projects)
6. Click **Create**
7. Vercel will automatically:
   - Create the database
   - Add `POSTGRES_URL` environment variable
   - Set up connection pooling

**Connection String Format:**
```
postgres://default:password@host.vercel-storage.com:5432/verceldb
```

**Note:** Vercel automatically sets `POSTGRES_URL` - you may need to map it to `DATABASE_URL`:
- In Vercel Dashboard → Settings → Environment Variables
- Add: `DATABASE_URL` = `$POSTGRES_URL` (or copy the value)

---

### Option 2: Supabase (Free Tier Available)

**Steps:**
1. Go to [Supabase](https://supabase.com)
2. Sign up / Log in
3. Click **New Project**
4. Fill in:
   - Project name: `subscription-sentry-prod`
   - Database password: (generate a strong password - save it!)
   - Region: Choose closest to your users
5. Click **Create new project**
6. Wait 2-3 minutes for setup
7. Go to **Settings** → **Database**
8. Find **Connection string** section
9. Copy the **URI** connection string

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Replace `[YOUR-PASSWORD]` with your actual password**

---

### Option 3: Railway (Simple & Fast)

**Steps:**
1. Go to [Railway](https://railway.app)
2. Sign up / Log in (GitHub login works)
3. Click **New Project**
4. Click **+ New** → **Database** → **Add PostgreSQL**
5. Railway automatically creates the database
6. Click on the PostgreSQL service
7. Go to **Variables** tab
8. Copy the `DATABASE_URL` value

**Connection String:**
Railway automatically provides `DATABASE_URL` - just copy it!

---

### Option 4: Neon (Serverless PostgreSQL)

**Steps:**
1. Go to [Neon](https://neon.tech)
2. Sign up / Log in
3. Click **Create a project**
4. Fill in:
   - Project name: `subscription-sentry`
   - Region: Choose closest
5. Click **Create project**
6. Copy the connection string from the dashboard

**Connection String Format:**
```
postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

### Option 5: Render (Free Tier Available)

**Steps:**
1. Go to [Render](https://render.com)
2. Sign up / Log in
3. Click **New +** → **PostgreSQL**
4. Fill in:
   - Name: `subscription-sentry-db`
   - Database: `subscription_sentry`
   - User: (auto-generated)
   - Region: Choose closest
   - Plan: Free (or paid)
5. Click **Create Database**
6. Wait for provisioning (2-3 minutes)
7. Go to **Info** tab
8. Copy **Internal Database URL** or **External Database URL**

**Connection String Format:**
```
postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/dbname
```

---

## 🔧 After Getting Connection String

### Step 1: Test the Connection

```bash
# Install psql (PostgreSQL client) if needed
# Or use an online tool like https://www.pgadmin.org

# Test connection (replace with your connection string)
psql "postgresql://user:password@host:port/database"
```

### Step 2: Set in Production Environment

**For Vercel:**
1. Go to Project → Settings → Environment Variables
2. Add new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://user:password@host:port/database?sslmode=require`
   - **Environment:** Production
3. Click **Save**

**For Railway:**
1. Go to your project
2. Click **Variables** tab
3. Add:
   - **Key:** `DATABASE_URL`
   - **Value:** (paste your connection string)
4. Click **Add**

**For Other Platforms:**
- Add `DATABASE_URL` in their environment variable settings
- Make sure it's set for **Production** environment

### Step 3: Run Database Migrations

After setting `DATABASE_URL` in production:

```bash
# Option 1: Run migrations via Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy

# Option 2: Run migrations directly (if you have access)
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

---

## 🔒 Security Best Practices

1. **Use SSL:** Always include `?sslmode=require` in connection string
2. **Strong Password:** Use a long, random password
3. **Environment Variables:** Never commit connection strings to git
4. **Connection Pooling:** Use connection pooling for production (most providers include this)
5. **Backup:** Enable automatic backups (most providers do this)

---

## 💰 Cost Comparison

| Provider | Free Tier | Paid Plans Start At |
|----------|-----------|---------------------|
| **Vercel Postgres** | Limited (Hobby) | $20/month |
| **Supabase** | 500MB storage | $25/month |
| **Railway** | $5 credit/month | Pay-as-you-go |
| **Neon** | 0.5GB storage | $19/month |
| **Render** | 90 days free | $7/month |

**Recommendation for Start:**
- **Supabase** or **Neon** - Best free tiers
- **Railway** - Easiest setup
- **Vercel Postgres** - Best if already using Vercel

---

## 🧪 Testing Your Setup

After setting up, test the connection:

```bash
# Test with Prisma
npx prisma db pull

# Or test with a simple script
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$connect().then(() => {
  console.log('✅ Database connected!');
  prisma.\$disconnect();
}).catch((e) => {
  console.error('❌ Connection failed:', e);
  process.exit(1);
});
"
```

---

## 📝 Quick Checklist

- [ ] Choose a PostgreSQL provider
- [ ] Create database instance
- [ ] Copy connection string
- [ ] Add `DATABASE_URL` to production environment variables
- [ ] Test connection
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify tables created: `npx prisma studio` (or check in provider dashboard)

---

## 🆘 Troubleshooting

### Connection Refused
- Check if database is running
- Verify connection string format
- Check firewall/network settings

### SSL Required
- Add `?sslmode=require` to connection string
- Some providers require SSL by default

### Authentication Failed
- Verify username and password
- Check if user has proper permissions
- Some providers use different user format

### Migration Errors
- Ensure Prisma schema matches database
- Run `npx prisma generate` first
- Check Prisma logs for specific errors

---

**Need Help?** Check provider documentation or their support channels.


