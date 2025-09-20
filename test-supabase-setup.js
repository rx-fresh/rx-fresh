/**
 * Test script for Supabase setup
 * Run this after configuring environment variables
 * Usage: node test-supabase-setup.js
 */

const fetch = require('node-fetch');

const PROJECT_REF = 'cvxyixjkcomlwvukfmaf';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// You'll need to set these environment variables or replace with actual values
const SUPABASE_AUTH_HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;
const TEST_EMAIL = 'test@example.com';
const TEST_OTP = '123456';

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_AUTH_HOOK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        otp: TEST_OTP
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Edge function test passed!');
      console.log('Response:', result);
    } else {
      console.log('❌ Edge function test failed!');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }
  } catch (error) {
    console.log('❌ Edge function test error:', error.message);
  }
}

async function testSupabaseConnection() {
  console.log('🔗 Testing Supabase connection...');

  try {
    // Test basic connection to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || 'your-anon-key'
      }
    });

    if (response.ok) {
      console.log('✅ Supabase connection successful!');
    } else {
      console.log('❌ Supabase connection failed!');
      console.log('Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
  }
}

async function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');

  const required = [
    'SUPABASE_AUTH_HOOK_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM'
  ];

  let allSet = true;

  required.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      allSet = false;
    }
  });

  return allSet;
}

async function runTests() {
  console.log('🚀 Starting Supabase setup tests...\n');

  const envVarsSet = await checkEnvironmentVariables();

  if (!envVarsSet) {
    console.log('\n❌ Please set all required environment variables first!');
    console.log('Check SUPABASE_DEPLOYMENT_GUIDE.md for instructions.');
    return;
  }

  console.log('\n' + '='.repeat(50));

  await testSupabaseConnection();
  console.log('');
  await testEdgeFunction();

  console.log('\n' + '='.repeat(50));
  console.log('📋 Next Steps:');
  console.log('1. Test the authentication flow in your React app');
  console.log('2. Check Supabase function logs if issues persist');
  console.log('3. Verify email delivery in Resend dashboard');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEdgeFunction, testSupabaseConnection, checkEnvironmentVariables };
