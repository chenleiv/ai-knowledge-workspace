/**
 * Security Verification Test Suite
 * 
 * This script tests the newly implemented security measures:
 * 1. Security Headers (Helmet)
 * 2. Rate Limiting
 * 3. Input Validation (Zod)
 * 
 * Usage: node backend/security_tests.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000';

async function runTests() {
  console.log('🚀 Starting Security Verification Tests...\n');

  try {
    // 0. Login to get a session cookie
    console.log('--- Logging in to get session ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' })
    });
    
    const cookie = loginRes.headers.get('set-cookie');
    if (!cookie) {
      console.error('❌ Failed to get login cookie. Tests will fail.');
    } else {
      console.log('✅ Successfully authenticated.\n');
    }

    // 1. Test Security Headers
    console.log('--- Testing Security Headers ---');
    const headerRes = await fetch(`${BASE_URL}/health`);
    const headers = headerRes.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'content-security-policy'
    ];

    requiredHeaders.forEach(h => {
      const val = headers.get(h);
      if (val) {
        console.log(`✅ Header ${h} is present: ${val}`);
      } else {
        console.warn(`⚠️ Header ${h} is missing.`);
      }
    });
    console.log('');

    // 2. Test Input Validation (Login - No Cookie needed)
    console.log('--- Testing Input Validation (Login) ---');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'short' })
    });
    
    if (badLoginRes.status === 400) {
      console.log('✅ Correctly rejected malformed login data (400).');
    } else {
      console.error(`❌ Unexpected status for malformed login: ${badLoginRes.status}`);
    }
    console.log('');

    // 3. Test Rate Limiting Headers
    console.log('--- Testing Rate Limiting Headers ---');
    const rateLimitRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@demo.com', password: 'password123' })
    });
    
    const limit = rateLimitRes.headers.get('ratelimit-limit') || rateLimitRes.headers.get('x-ratelimit-limit');
    
    if (limit) {
      console.log(`✅ Rate limit headers found: Limit=${limit}`);
    } else {
      console.warn('⚠️ Rate limit headers missing.');
    }
    console.log('');

    // 4. Test AI Input Validation (Cookie needed)
    console.log('--- Testing AI Input Validation ---');
    const badAIRes = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookie
        },
        body: JSON.stringify({ message: '' }) 
    });

    if (badAIRes.status === 400) {
        console.log('✅ Correctly rejected empty AI message (400).');
    } else {
        console.error(`❌ Unexpected status for empty AI message: ${badAIRes.status} (Expected 400)`);
    }
    console.log('');

    console.log('✅ Security tests completed!');

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

runTests();
