#!/bin/bash

# Pre-Deployment Check Script
# Run before deploying to production: bash scripts/pre-deploy-check.sh

set -e

echo "🚀 Running Pre-Deployment Checks..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "   Node.js: $NODE_VERSION"
echo ""

# Check if .env.production exists
echo "🔐 Checking environment variables..."
if [ ! -f ".env.production" ]; then
    echo "   ⚠️  .env.production not found (this is okay if using platform env vars)"
else
    echo "   ✅ .env.production found"
fi
echo ""

# Validate environment variables
echo "🔍 Validating environment variables..."
npx tsx scripts/validate-production-env.ts
echo ""

# Run TypeScript check
echo "📝 Running TypeScript check..."
npx tsc --noEmit
echo "   ✅ TypeScript check passed"
echo ""

# Run linting
echo "🧹 Running linter..."
npm run lint
echo "   ✅ Linting passed"
echo ""

# Build the application
echo "🏗️  Building application..."
npm run build
echo "   ✅ Build successful"
echo ""

# Check build output
if [ -d ".next" ]; then
    echo "   ✅ .next directory created"
else
    echo "   ❌ .next directory not found"
    exit 1
fi
echo ""

# Check Prisma
echo "🗄️  Checking Prisma setup..."
npx prisma generate
echo "   ✅ Prisma client generated"
echo ""

echo "✅ All pre-deployment checks passed!"
echo ""
echo "🚀 Ready for production deployment!"
echo ""

