#!/usr/bin/env node

const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });

const secretsManager = new AWS.SecretsManager();
const sts = new AWS.STS();

async function testSecretsAccess() {
  console.log('🔍 Testing Secrets Manager access...\n');

  try {
    // Test 1: Get current identity
    console.log('1. Checking current identity...');
    const identity = await sts.getCallerIdentity().promise();
    console.log(`   Account: ${identity.Account}`);
    console.log(`   User/Role: ${identity.Arn}\n`);

    // Test 2: List secrets
    console.log('2. Listing secrets...');
    const secrets = await secretsManager.listSecrets().promise();
    console.log(`   Found ${secrets.SecretList.length} secrets`);
    
    const requiredSecrets = [
      'layercode/api-key',
      'layercode/webhook-secret', 
      'google/generative-ai-key'
    ];

    console.log('\n3. Checking required secrets...');
    for (const secretName of requiredSecrets) {
      try {
        const secret = secrets.SecretList.find(s => s.Name === secretName);
        if (secret) {
          console.log(`   ✅ ${secretName} - EXISTS`);
        } else {
          console.log(`   ❌ ${secretName} - MISSING`);
        }
      } catch (error) {
        console.log(`   ❌ ${secretName} - ERROR: ${error.message}`);
      }
    }

    // Test 3: Try to get secret values (this will test actual permissions)
    console.log('\n4. Testing secret value access...');
    for (const secretName of requiredSecrets) {
      try {
        await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        console.log(`   ✅ ${secretName} - ACCESSIBLE`);
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          console.log(`   ⚠️  ${secretName} - NOT FOUND (create this secret)`);
        } else if (error.code === 'AccessDeniedException') {
          console.log(`   ❌ ${secretName} - ACCESS DENIED (IAM permissions issue)`);
        } else {
          console.log(`   ❌ ${secretName} - ERROR: ${error.message}`);
        }
      }
    }

    console.log('\n✅ IAM permissions test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSecretsAccess(); 