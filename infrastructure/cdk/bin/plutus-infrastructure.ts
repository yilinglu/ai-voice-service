#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { PlutusInfrastructureStack } from '../lib/plutus-infrastructure-stack';

const app = new cdk.App();

// Get environment variables with defaults
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Get environment from context or environment variable - FAIL FAST if not specified
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT;

if (!environment) {
  console.error('❌ ERROR: Environment not specified!');
  console.error('Please specify the environment using one of these methods:');
  console.error('  1. CDK context: -c environment=staging');
  console.error('  2. Environment variable: ENVIRONMENT=staging');
  console.error('');
  console.error('Valid environments: staging, prod');
  console.error('');
  console.error('Examples:');
  console.error('  cdk deploy -c environment=staging');
  console.error('  ENVIRONMENT=staging cdk deploy');
  process.exit(1);
}

// Validate environment
if (!['staging', 'prod'].includes(environment)) {
  console.error(`❌ ERROR: Invalid environment "${environment}"`);
  console.error('Valid environments: staging, prod');
  process.exit(1);
}

console.log(`🚀 Deploying to environment: ${environment}`);

// Domain configuration
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME || 'dragon0.com';
let subdomain: string | undefined;

// Set subdomain based on environment
switch (environment) {
  case 'staging':
    subdomain = 'staging';
    break;
  case 'prod':
    subdomain = 'api';
    break;
  default:
    console.error(`❌ ERROR: No subdomain configured for environment "${environment}"`);
    process.exit(1);
}

// Get image tag from .image-tag file or use default
let imageTag = 'latest';
const imageTagPath = path.join(__dirname, '../.image-tag');
if (fs.existsSync(imageTagPath)) {
  imageTag = fs.readFileSync(imageTagPath, 'utf8').trim();
  console.log(`Using image tag from .image-tag file: ${imageTag}`);
} else {
  console.log(`No .image-tag file found, using default: ${imageTag}`);
}

// Create the stack
new PlutusInfrastructureStack(app, `PlutusInfrastructureStack-${environment}`, {
  env: {
    account,
    region,
  },
  environment,
  domainName,
  subdomain,
  imageTag,
  description: `Plutus Voice Agent Infrastructure - ${environment} environment`,
  tags: {
    Environment: environment,
    Service: 'plutus-voice-agent',
    ManagedBy: 'cdk',
  },
});

// Add tags to all resources
cdk.Tags.of(app).add('Service', 'plutus-voice-agent');
cdk.Tags.of(app).add('ManagedBy', 'cdk'); 