# Supabase Database Setup - Quick Guide

## ✅ You Already Have Supabase!

Your connection string:
```
postgresql://postgres.fsjnxfopzduvlwgenqgw:Autumn%2322AAPra@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 🔧 Next Steps

### 1. Test Your Connection

Run this to verify your database connection works:

```bash
npm run test-db
```

This will:
- ✅ Test the connection
- ✅ Check if tables exist
- ✅ Verify Prisma schema sync

### 2. Run Database Migrations

Your Supabase database needs the Prisma schema tables. Run:

```bash
# Set your DATABASE_URL temporarily (or add to .env.local)
$env:DATABASE_URL="postgresql://postgres.fsjnxfopzduvlwgenqgw:Autumn%2322AAPra@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Run migrations
npx prisma migrate deploy

# Or if you prefer to push schema directly
npx prisma db push
```

**Note:** The `%23` in your password is URL encoding for `#`. This is correct!

### 3. Add to Production Environment

**For Vercel:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://postgres.fsjnxfopzduvlwgenqgw:Autumn%2322AAPra@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Environment:** Production (and Preview if needed)
4. Click **Save**

**For Other Platforms:**
- Add `DATABASE_URL` in their environment variable settings
- Use the same connection string

### 4. Optional: Add to .env.local (for local testing)

You can add this to your `.env.local` to test locally:

```env
# Supabase Production Database (for testing)
DATABASE_URL="postgresql://postgres.fsjnxfopzduvlwgenqgw:Autumn%2322AAPra@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**⚠️ Important:** 
- Keep your local SQLite database for development: `DATABASE_URL="file:./prisma/dev.db"`
- Only use Supabase connection string when you want to test against production database
- Or create a separate `.env.production.local` file

## 🔍 Understanding Your Connection String

```
postgresql://
  postgres.fsjnxfopzduvlwgenqgw    ← Username (project-specific)
  :Autumn%2322AAPra                ← Password (URL-encoded, %23 = #)
  @aws-1-ap-south-1.pooler.supabase.com  ← Host (Supabase pooler)
  :6543                            ← Port (pgBouncer port)
  /postgres                        ← Database name
  ?pgbouncer=true                  ← Using connection pooling
```

**Key Points:**
- ✅ Using **pgBouncer** (connection pooling) - good for production
- ✅ Region: **ap-south-1** (Asia Pacific - South 1, Mumbai)
- ✅ Port **6543** is the pooler port (not direct connection)

## 🚀 Direct Connection (Alternative)

If you need a direct connection (not pooled), Supabase also provides:
- **Direct connection port:** Usually `5432` or `5433`
- **Connection string format:** Similar but different port

Check your Supabase dashboard → Settings → Database for both connection strings.

## ✅ Verification Checklist

- [ ] Connection string is correct
- [ ] Tested connection: `npm run test-db`
- [ ] Migrations run: `npx prisma migrate deploy`
- [ ] Tables created (check with `npx prisma studio`)
- [ ] Added to production environment variables
- [ ] Production deployment uses the correct `DATABASE_URL`

## 🆘 Troubleshooting

### Connection Timeout
- Check if Supabase project is active
- Verify firewall/network settings
- Try direct connection port instead of pooler

### Authentication Failed
- Password is URL-encoded correctly (`%23` for `#`)
- Username matches Supabase project
- Check Supabase dashboard for correct credentials

### Tables Not Found
- Run migrations: `npx prisma migrate deploy`
- Or push schema: `npx prisma db push`
- Verify in Supabase dashboard → Table Editor

## 📚 Supabase Resources

- **Dashboard:** https://supabase.com/dashboard
- **Documentation:** https://supabase.com/docs
- **Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

---

**You're all set!** Your Supabase database is ready. Just add the `DATABASE_URL` to your production environment variables and run migrations.

