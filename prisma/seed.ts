/**
 * Prisma Seed Script
 * 
 * Seeds the database with known merchants data
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import { knownMerchants } from './seeds/knownMerchants';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < knownMerchants.length; i++) {
    const merchant = knownMerchants[i];
    const progress = `[${i + 1}/${knownMerchants.length}]`;

    try {
      // Check if merchant already exists
      const existing = await prisma.knownMerchant.findUnique({
        where: { name: merchant.name },
      });

      if (existing) {
        // Update existing merchant
        await prisma.knownMerchant.update({
          where: { name: merchant.name },
          data: {
            displayName: merchant.displayName,
            category: merchant.category,
            logoUrl: merchant.logoUrl,
            website: merchant.website,
            keywords: merchant.keywords,
            countries: merchant.countries,
            currency: merchant.currency,
            typicalAmounts: merchant.typicalAmounts as any,
            billingCycles: merchant.billingCycles,
            isActive: true,
          },
        });
        updated++;
        process.stdout.write(`${progress} Updated: ${merchant.name}\r`);
      } else {
        // Create new merchant
        await prisma.knownMerchant.create({
          data: {
            name: merchant.name,
            displayName: merchant.displayName,
            category: merchant.category,
            logoUrl: merchant.logoUrl,
            website: merchant.website,
            keywords: merchant.keywords,
            countries: merchant.countries,
            currency: merchant.currency,
            typicalAmounts: merchant.typicalAmounts as any,
            billingCycles: merchant.billingCycles,
            isActive: true,
            matchCount: 0,
          },
        });
        created++;
        process.stdout.write(`${progress} Created: ${merchant.name}\r`);
      }
    } catch (error) {
      skipped++;
      console.error(`\n${progress} ❌ Error with ${merchant.name}:`, error);
    }
  }

  console.log('\n\n✅ Seed completed!');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${knownMerchants.length}\n`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

