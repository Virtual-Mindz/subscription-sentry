import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const oldDbUrl = process.env.OLD_DATABASE_URL;
const newDbUrl = process.env.DATABASE_URL;

if (!oldDbUrl || !newDbUrl) {
  console.error('❌ Missing database URLs');
  process.exit(1);
}

const oldDb = new PrismaClient({
  datasources: { db: { url: oldDbUrl.replace(/"/g, '') } },
});

const newDb = new PrismaClient({
  datasources: { db: { url: newDbUrl.replace(/"/g, '') } },
});

async function verify() {
  try {
    await oldDb.$connect();
    await newDb.$connect();

    const oldUsers = await oldDb.user.count();
    const newUsers = await newDb.user.count();
    const oldSubs = await oldDb.subscription.count();
    const newSubs = await newDb.subscription.count();
    const oldBanks = await oldDb.bankAccount.count();
    const newBanks = await newDb.bankAccount.count();
    const oldTxs = await oldDb.transaction.count();
    const newTxs = await newDb.transaction.count();

    console.log('\n📊 Migration Verification:\n');
    console.log(`Users:        ${oldUsers} → ${newUsers} ${oldUsers === newUsers ? '✅' : '❌'}`);
    console.log(`BankAccounts: ${oldBanks} → ${newBanks} ${oldBanks === newBanks ? '✅' : '❌'}`);
    console.log(`Subscriptions: ${oldSubs} → ${newSubs} ${oldSubs === newSubs ? '✅' : '❌'}`);
    console.log(`Transactions: ${oldTxs} → ${newTxs} ${oldTxs === newTxs ? '✅' : '❌'}`);

    if (oldUsers === newUsers && oldSubs === newSubs && oldBanks === newBanks && oldTxs === newTxs) {
      console.log('\n✅ All data migrated successfully!');
      
      // Show sample data
      const users = await newDb.user.findMany();
      const subs = await newDb.subscription.findMany();
      
      console.log('\n📋 Sample Data:');
      if (users.length > 0) {
        console.log(`\nUser: ${users[0].email} (${users[0].name || 'No name'})`);
      }
      if (subs.length > 0) {
        console.log(`\nSubscriptions:`);
        subs.forEach(sub => {
          console.log(`  - ${sub.merchant || sub.name}: $${sub.amount}/month (${sub.status})`);
        });
      }
    } else {
      console.log('\n⚠️  Data counts do not match. Please review.');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

verify();

