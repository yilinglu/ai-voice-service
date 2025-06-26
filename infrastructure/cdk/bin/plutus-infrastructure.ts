#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PlutusInfrastructureStack } from '../lib/plutus-infrastructure-stack';

const app = new cdk.App();

// Get environment variables with defaults
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

// Create the main infrastructure stack
new PlutusInfrastructureStack(app, `PlutusInfrastructureStack-${environment}`, {
  env: { account, region },
  environment,
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