#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DomainInfrastructureStack } from '../lib/domain-infrastructure-stack';

const app = new cdk.App();

// Get domain configuration from context or environment
let subdomains = app.node.tryGetContext('subdomains') || ['staging', 'api'];
if (typeof subdomains === 'string') {
  try {
    subdomains = JSON.parse(subdomains);
  } catch {
    subdomains = subdomains.split(',').map((s: string) => s.trim());
  }
}
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME || 'dragon0.com';

// Get AWS account and region
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Create domain infrastructure stack
new DomainInfrastructureStack(app, 'PlutusDomainInfrastructure', {
  domainName,
  subdomains,
  env: {
    account,
    region,
  },
  description: 'Plutus Domain Infrastructure - Route53, DNSSEC, SSL Certificates',
});

app.synth(); 