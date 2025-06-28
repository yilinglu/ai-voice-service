#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CICDPipelineStack } from '../lib/cicd-pipeline';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

const app = new cdk.App();

// Get configuration from context or environment
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Domain configuration
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME || 'dragon0.com';
const stagingSubdomain = app.node.tryGetContext('stagingSubdomain') || 'staging';
const productionSubdomain = app.node.tryGetContext('productionSubdomain') || 'api';

// GitHub configuration
const githubOwner = app.node.tryGetContext('githubOwner') || process.env.GITHUB_OWNER || 'your-github-username';
const githubRepo = app.node.tryGetContext('githubRepo') || process.env.GITHUB_REPO || 'ai-voice-service';
const githubBranch = app.node.tryGetContext('githubBranch') || process.env.GITHUB_BRANCH || 'main';
const githubTokenSecretName = app.node.tryGetContext('githubTokenSecretName') || process.env.GITHUB_TOKEN_SECRET_NAME || 'github/oauth-token';

// Import existing hosted zones and certificates
const stagingHostedZone = route53.HostedZone.fromLookup(app, 'StagingHostedZone', {
  domainName: `${stagingSubdomain}.${domainName}`,
});

const productionHostedZone = route53.HostedZone.fromLookup(app, 'ProductionHostedZone', {
  domainName: `${productionSubdomain}.${domainName}`,
});

const stagingCertificate = acm.Certificate.fromCertificateArn(
  app,
  'StagingCertificate',
  cdk.Fn.importValue(`plutus-certificate-arn-${stagingSubdomain}`)
);

const productionCertificate = acm.Certificate.fromCertificateArn(
  app,
  'ProductionCertificate',
  cdk.Fn.importValue(`plutus-certificate-arn-${productionSubdomain}`)
);

// Create CI/CD pipeline stack
new CICDPipelineStack(app, 'PlutusCICDPipeline', {
  env: { account, region },
  domainName,
  stagingSubdomain,
  productionSubdomain,
  stagingHostedZone,
  productionHostedZone,
  stagingCertificate,
  productionCertificate,
  githubOwner,
  githubRepo,
  githubBranch,
  githubTokenSecretName,
  description: 'Plutus Voice Agent CI/CD Pipeline - Automated deployment from staging to production',
  tags: {
    Service: 'plutus-voice-agent',
    Component: 'cicd-pipeline',
    ManagedBy: 'cdk',
  },
});

app.synth(); 