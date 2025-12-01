import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl.replace(/"/g, ''),
    },
  },
});

async function resetPassword() {
  try {
    console.log('🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    const email = 'deenadhayalanrathinavel@gmail.com';
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ User found: ${user.email} (${user.name})\n`);
    
    // Get new password from command line argument or use default
    const newPassword = process.argv[2];
    
    if (!newPassword) {
      console.log('❌ Please provide a password as an argument:');
      console.log('   Usage: npx tsx scripts/reset-password.ts "your-new-password"');
      console.log('\n   Example: npx tsx scripts/reset-password.ts "MyNewPassword123"');
      process.exit(1);
    }

    if (newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    console.log('🔐 Hashing password...');
    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('💾 Updating password in database...');
    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log('\n✅ Password updated successfully!');
    console.log('   You can now log in with the new password.');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

resetPassword();

