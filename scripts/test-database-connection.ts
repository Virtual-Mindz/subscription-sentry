/**
 * Test Database Connection Script
 * 
 * Tests the production database connection
 * Usage: npx tsx scripts/test-database-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const prisma = new PrismaClient();

async function testConnection() {
  console.log('\n🔍 Testing Database Connection...\n');

  // Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('\n💡 Set DATABASE_URL in your .env.local or .env.production file');
    process.exit(1);
  }

  // Mask password in connection string for display
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`📊 Connection String: ${maskedUrl}\n`);

  try {
    // Test connection
    console.log('⏳ Connecting to database...');
    await prisma.$connect();
    console.log('✅ Successfully connected to database!\n');

    // Test query
    console.log('⏳ Testing query...');
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('✅ Query successful!\n');

    // Check if tables exist
    console.log('⏳ Checking database schema...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    // Expected tables from Prisma schema
    const expectedTables = [
      'User',
      'Subscription',
      'Transaction',
      'BankAccount',
      'KnownMerchant',
      'Notification',
      '_prisma_migrations',
    ].map(t => t.toLowerCase());

    if (tables.length === 0) {
      console.log('⚠️  No tables found. You may need to run migrations.\n');
      console.log('💡 Run: npx prisma migrate deploy\n');
    } else {
      console.log(`✅ Found ${tables.length} table(s):`);
      const foundTableNames = tables.map(t => t.tablename.toLowerCase());
      tables.forEach((table) => {
        const isExpected = expectedTables.includes(table.tablename.toLowerCase());
        console.log(`   ${isExpected ? '✅' : '⚠️ '} ${table.tablename}`);
      });
      console.log('');

      // Check if all expected tables exist
      const missingTables = expectedTables.filter(
        expected => !foundTableNames.includes(expected)
      );

      if (missingTables.length > 0) {
        console.log('⚠️  Missing expected tables:');
        missingTables.forEach(table => console.log(`   - ${table}`));
        console.log('\n💡 You may need to run migrations: npx prisma migrate deploy\n');
      } else {
        console.log('✅ All expected tables are present!\n');
        console.log('💡 Your database schema is up-to-date. No migrations needed!\n');
      }
    }

    // Check Prisma schema sync
    console.log('⏳ Checking Prisma schema sync...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma schema is in sync!\n');

    console.log('✅ All database checks passed!\n');
    console.log('🚀 Your database is ready for production!\n');

  } catch (error) {
    console.error('\n❌ Database connection failed!\n');
    
    if (error instanceof Error) {
      console.error('Error:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('authentication failed')) {
        console.error('\n💡 Authentication failed. Check:');
        console.error('   - Username and password are correct');
        console.error('   - Password is URL-encoded (e.g., %23 for #)');
      } else if (error.message.includes('does not exist')) {
        console.error('\n💡 Database does not exist. Check:');
        console.error('   - Database name is correct');
        console.error('   - Database is created in Supabase');
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Connection timeout. Check:');
        console.error('   - Host and port are correct');
        console.error('   - Firewall/network settings');
        console.error('   - Supabase project is active');
      } else if (error.message.includes('SSL')) {
        console.error('\n💡 SSL connection issue. Check:');
        console.error('   - Connection string includes ?sslmode=require');
        console.error('   - Supabase allows SSL connections');
      }
    } else {
      console.error('Unknown error:', error);
    }
    
    console.error('\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

