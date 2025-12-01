import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const oldDbUrl = process.env.OLD_DATABASE_URL;
const newDbUrl = process.env.DATABASE_URL;

if (!oldDbUrl || !newDbUrl) {
  console.error('❌ Missing database URLs in .env.local');
  console.error('Required: OLD_DATABASE_URL and DATABASE_URL');
  process.exit(1);
}

// Create Prisma clients for both databases
const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: oldDbUrl.replace(/"/g, ''), // Remove quotes if present
    },
  },
});

const newDb = new PrismaClient({
  datasources: {
    db: {
      url: newDbUrl.replace(/"/g, ''), // Remove quotes if present
    },
  },
});

async function migrateData() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Test connections
    console.log('📡 Testing database connections...');
    await oldDb.$connect();
    console.log('✅ Connected to OLD database');
    await newDb.$connect();
    console.log('✅ Connected to NEW database\n');

    // 1. Migrate Users (must be first due to foreign keys)
    console.log('👤 Migrating Users...');
    const users = await oldDb.user.findMany();
    console.log(`   Found ${users.length} users`);
    
    for (const user of users) {
      try {
        await newDb.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            name: user.name,
            password: user.password,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            password: user.password,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        });
      } catch (error: any) {
        console.error(`   ⚠️  Error migrating user ${user.id}: ${error.message}`);
      }
    }
    console.log(`   ✅ Migrated ${users.length} users\n`);

    // 2. Migrate BankAccounts
    console.log('🏦 Migrating BankAccounts...');
    const bankAccounts = await oldDb.bankAccount.findMany();
    console.log(`   Found ${bankAccounts.length} bank accounts`);
    
    for (const account of bankAccounts) {
      try {
        await newDb.bankAccount.upsert({
          where: { id: account.id },
          update: {
            userId: account.userId,
            plaidId: account.plaidId,
            name: account.name,
            type: account.type,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
          create: {
            id: account.id,
            userId: account.userId,
            plaidId: account.plaidId,
            name: account.name,
            type: account.type,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
        });
      } catch (error: any) {
        console.error(`   ⚠️  Error migrating bank account ${account.id}: ${error.message}`);
      }
    }
    console.log(`   ✅ Migrated ${bankAccounts.length} bank accounts\n`);

    // 3. Migrate Subscriptions
    console.log('📦 Migrating Subscriptions...');
    const subscriptions = await oldDb.subscription.findMany();
    console.log(`   Found ${subscriptions.length} subscriptions`);
    
    for (const subscription of subscriptions) {
      try {
        await newDb.subscription.upsert({
          where: { id: subscription.id },
          update: {
            userId: subscription.userId,
            name: subscription.name,
            amount: subscription.amount,
            renewalDate: subscription.renewalDate,
            merchant: subscription.merchant,
            status: subscription.status,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
          },
          create: {
            id: subscription.id,
            userId: subscription.userId,
            name: subscription.name,
            amount: subscription.amount,
            renewalDate: subscription.renewalDate,
            merchant: subscription.merchant,
            status: subscription.status,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
          },
        });
      } catch (error: any) {
        console.error(`   ⚠️  Error migrating subscription ${subscription.id}: ${error.message}`);
      }
    }
    console.log(`   ✅ Migrated ${subscriptions.length} subscriptions\n`);

    // 4. Migrate Transactions (must be last due to foreign keys)
    console.log('💳 Migrating Transactions...');
    const transactions = await oldDb.transaction.findMany();
    console.log(`   Found ${transactions.length} transactions`);
    
    for (const transaction of transactions) {
      try {
        await newDb.transaction.upsert({
          where: { id: transaction.id },
          update: {
            userId: transaction.userId,
            bankAccountId: transaction.bankAccountId,
            subscriptionId: transaction.subscriptionId,
            amount: transaction.amount,
            date: transaction.date,
            description: transaction.description,
            merchant: transaction.merchant,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
          },
          create: {
            id: transaction.id,
            userId: transaction.userId,
            bankAccountId: transaction.bankAccountId,
            subscriptionId: transaction.subscriptionId,
            amount: transaction.amount,
            date: transaction.date,
            description: transaction.description,
            merchant: transaction.merchant,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
          },
        });
      } catch (error: any) {
        console.error(`   ⚠️  Error migrating transaction ${transaction.id}: ${error.message}`);
      }
    }
    console.log(`   ✅ Migrated ${transactions.length} transactions\n`);

    // Verification
    console.log('🔍 Verifying migration...\n');
    
    const oldUserCount = await oldDb.user.count();
    const newUserCount = await newDb.user.count();
    const oldSubCount = await oldDb.subscription.count();
    const newSubCount = await newDb.subscription.count();
    const oldTxCount = await oldDb.transaction.count();
    const newTxCount = await newDb.transaction.count();
    const oldBankCount = await oldDb.bankAccount.count();
    const newBankCount = await newDb.bankAccount.count();

    console.log('📊 Migration Summary:');
    console.log(`   Users:      ${oldUserCount} → ${newUserCount} ${oldUserCount === newUserCount ? '✅' : '❌'}`);
    console.log(`   BankAccounts: ${oldBankCount} → ${newBankCount} ${oldBankCount === newBankCount ? '✅' : '❌'}`);
    console.log(`   Subscriptions: ${oldSubCount} → ${newSubCount} ${oldSubCount === newSubCount ? '✅' : '❌'}`);
    console.log(`   Transactions:  ${oldTxCount} → ${newTxCount} ${oldTxCount === newTxCount ? '✅' : '❌'}`);

    if (
      oldUserCount === newUserCount &&
      oldSubCount === newSubCount &&
      oldTxCount === newTxCount &&
      oldBankCount === newBankCount
    ) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with mismatches. Please review the counts above.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
    console.log('\n🔌 Disconnected from databases');
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

