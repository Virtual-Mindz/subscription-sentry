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

async function checkUser() {
  try {
    console.log('🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    const email = 'deenadhayalanrathinavel@gmail.com';
    console.log(`🔍 Looking for user: ${email}\n`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('\n📋 All users in database:');
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true, password: true },
      });
      if (allUsers.length === 0) {
        console.log('  (No users found)');
      } else {
        allUsers.forEach(u => {
          console.log(`  - ${u.email} (${u.name}) - Password: ${u.password ? 'SET' : 'NOT SET'}`);
        });
      }
    } else {
      console.log(`✅ User found: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Password: ${user.password ? 'SET (hashed)' : 'NOT SET'}`);
      
      if (user.password) {
        console.log(`   Password hash: ${user.password.substring(0, 30)}...`);
        const hashType = user.password.startsWith('$2a$') ? 'bcrypt ($2a$)' : 
                        user.password.startsWith('$2b$') ? 'bcrypt ($2b$)' : 
                        user.password.startsWith('$2y$') ? 'bcrypt ($2y$)' : 'UNKNOWN';
        console.log(`   Hash type: ${hashType}`);
      } else {
        console.log('\n⚠️  User has no password! You need to set a password.');
        console.log('   You can either:');
        console.log('   1. Sign up with a new account');
        console.log('   2. Use the password reset script');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

checkUser();

