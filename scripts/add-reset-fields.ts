import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL?.replace(/"/g, '');

if (!dbUrl) {
  console.error('❌ Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function addFields() {
  try {
    console.log('🔌 Connecting to database...');
    console.log('Database URL:', dbUrl ? `${dbUrl.substring(0, 20)}...` : 'NOT FOUND');
    await prisma.$connect();
    console.log('✅ Connected\n');

    // Try to query the User table to see if fields exist
    console.log('Checking for existing columns...');
    const existingColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('resetPasswordToken', 'resetPasswordExpires')
    `;

    console.log('Current reset fields:', existingColumns);

    // Add columns using raw SQL if they don't exist
    console.log('\n📝 Adding resetPasswordToken column...');
    const result1 = await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT
    `;
    console.log('Result:', result1);

    console.log('📝 Adding resetPasswordExpires column...');
    const result2 = await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP
    `;
    console.log('Result:', result2);

    console.log('\n✅ Columns added successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected');
  }
}

addFields();

