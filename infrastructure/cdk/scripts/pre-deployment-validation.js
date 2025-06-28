#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });

const secretsManager = new AWS.SecretsManager();
const sts = new AWS.STS();
const ecr = new AWS.ECR();
const route53 = new AWS.Route53();

class PreDeploymentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateSecrets() {
    console.log('\n🔐 Validating Secrets Manager...');
    
    const requiredSecrets = [
      { name: 'layercode/api-key', description: 'Layercode API Key' },
      { name: 'layercode/webhook-secret', description: 'Layercode Webhook Secret' },
      { name: 'google/generative-ai-key', description: 'Google Generative AI API Key' }
    ];

    for (const secret of requiredSecrets) {
      try {
        const result = await secretsManager.getSecretValue({ SecretId: secret.name }).promise();
        const secretValue = result.SecretString;

        if (!secretValue || secretValue.includes('your-') || secretValue.includes('placeholder')) {
          this.errors.push(`${secret.description} (${secret.name}) contains placeholder value: "${secretValue}"`);
          this.log(`${secret.description} contains placeholder value`, 'error');
        } else {
          this.success.push(`${secret.description} is properly configured`);
          this.log(`${secret.description} is properly configured`);
        }
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          this.errors.push(`${secret.description} (${secret.name}) does not exist`);
          this.log(`${secret.description} does not exist`, 'error');
        } else if (error.code === 'AccessDeniedException') {
          this.errors.push(`Cannot access ${secret.description} - IAM permissions issue`);
          this.log(`Cannot access ${secret.description}`, 'error');
        } else {
          this.errors.push(`Error accessing ${secret.description}: ${error.message}`);
          this.log(`Error accessing ${secret.description}: ${error.message}`, 'error');
        }
      }
    }
  }

  async validateECR() {
    console.log('\n🐳 Validating ECR Repository...');
    
    try {
      const repositories = await ecr.describeRepositories({ repositoryNames: ['plutus-server'] }).promise();
      const repo = repositories.repositories[0];
      
      if (repo) {
        this.success.push('ECR repository plutus-server exists');
        this.log('ECR repository plutus-server exists');
        
        // Check if there are images
        const images = await ecr.listImages({ repositoryName: 'plutus-server' }).promise();
        if (images.imageIds.length === 0) {
          this.warnings.push('ECR repository plutus-server has no images');
          this.log('ECR repository has no images', 'warning');
        } else {
          this.success.push(`ECR repository has ${images.imageIds.length} image(s)`);
          this.log(`ECR repository has ${images.imageIds.length} image(s)`);
        }
      }
    } catch (error) {
      if (error.code === 'RepositoryNotFoundException') {
        this.errors.push('ECR repository plutus-server does not exist');
        this.log('ECR repository plutus-server does not exist', 'error');
      } else {
        this.errors.push(`Error accessing ECR: ${error.message}`);
        this.log(`Error accessing ECR: ${error.message}`, 'error');
      }
    }
  }

  async validateDomain() {
    console.log('\n🌐 Validating Domain Configuration...');
    
    try {
      const hostedZones = await route53.listHostedZones().promise();
      const stagingZone = hostedZones.HostedZones.find(zone => zone.Name === 'staging.dragon0.com.');
      
      if (stagingZone) {
        this.success.push('Domain staging.dragon0.com is configured');
        this.log('Domain staging.dragon0.com is configured');
      } else {
        this.warnings.push('Domain staging.dragon0.com not found - will use ALB DNS');
        this.log('Domain staging.dragon0.com not found', 'warning');
      }
    } catch (error) {
      this.warnings.push(`Error checking domain: ${error.message}`);
      this.log(`Error checking domain: ${error.message}`, 'warning');
    }
  }

  async validateIAM() {
    console.log('\n🔑 Validating IAM Permissions...');
    
    try {
      const identity = await sts.getCallerIdentity().promise();
      this.success.push(`Using AWS account: ${identity.Account}`);
      this.log(`Using AWS account: ${identity.Account}`);
      
      // Test basic permissions
      await secretsManager.listSecrets().promise();
      this.success.push('Secrets Manager access confirmed');
      this.log('Secrets Manager access confirmed');
      
      await ecr.describeRepositories({ maxResults: 1 }).promise();
      this.success.push('ECR access confirmed');
      this.log('ECR access confirmed');
      
    } catch (error) {
      this.errors.push(`IAM validation failed: ${error.message}`);
      this.log(`IAM validation failed: ${error.message}`, 'error');
    }
  }

  async validateImageTag() {
    console.log('\n🏷️ Validating Image Tag...');
    
    const imageTagFile = path.join(__dirname, '..', '.image-tag');
    
    if (fs.existsSync(imageTagFile)) {
      const imageTag = fs.readFileSync(imageTagFile, 'utf8').trim();
      if (imageTag && imageTag !== 'latest') {
        this.success.push(`Using image tag: ${imageTag}`);
        this.log(`Using image tag: ${imageTag}`);
      } else {
        this.warnings.push('Using default image tag: latest');
        this.log('Using default image tag: latest', 'warning');
      }
    } else {
      this.warnings.push('No .image-tag file found, will use latest');
      this.log('No .image-tag file found', 'warning');
    }
  }

  async validateEnvironment() {
    console.log('\n🌍 Validating Environment Configuration...');
    
    const requiredEnvVars = ['AWS_DEFAULT_REGION', 'AWS_PROFILE'];
    const missing = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missing.length === 0) {
      this.success.push('Environment variables are configured');
      this.log('Environment variables are configured');
    } else {
      this.warnings.push(`Missing environment variables: ${missing.join(', ')}`);
      this.log(`Missing environment variables: ${missing.join(', ')}`, 'warning');
    }
  }

  async validateOrphanedResources() {
    console.log('\n🧹 Checking for Orphaned Resources...');
    
    try {
      // Check for orphaned VPCs
      const vpcs = await new AWS.EC2().describeVpcs().promise();
      const orphanedVpcs = vpcs.Vpcs.filter(vpc => 
        !vpc.Tags || !vpc.Tags.some(tag => tag.Key === 'aws:cloudformation:stack-name')
      );
      
      if (orphanedVpcs.length > 0) {
        this.warnings.push(`Found ${orphanedVpcs.length} VPC(s) not managed by CloudFormation`);
        this.log(`Found ${orphanedVpcs.length} orphaned VPC(s)`, 'warning');
      } else {
        this.success.push('No orphaned VPCs found');
        this.log('No orphaned VPCs found');
      }
      
      // Check for orphaned ECS clusters
      const clusters = await new AWS.ECS().listClusters().promise();
      const orphanedClusters = clusters.clusterArns.filter(cluster => 
        !cluster.includes('plutus-cluster')
      );
      
      if (orphanedClusters.length > 0) {
        this.warnings.push(`Found ${orphanedClusters.length} ECS cluster(s) not related to plutus`);
        this.log(`Found ${orphanedClusters.length} unrelated ECS cluster(s)`, 'warning');
      } else {
        this.success.push('No orphaned ECS clusters found');
        this.log('No orphaned ECS clusters found');
      }
      
    } catch (error) {
      this.warnings.push(`Error checking orphaned resources: ${error.message}`);
      this.log(`Error checking orphaned resources: ${error.message}`, 'warning');
    }
  }

  async runAllValidations() {
    console.log('🚀 Starting Pre-Deployment Validation...\n');
    
    await this.validateIAM();
    await this.validateSecrets();
    await this.validateECR();
    await this.validateDomain();
    await this.validateImageTag();
    await this.validateEnvironment();
    await this.validateOrphanedResources();
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    if (this.success.length > 0) {
      console.log(`\n✅ SUCCESS (${this.success.length}):`);
      this.success.forEach(item => console.log(`  • ${item}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(item => console.log(`  • ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach(item => console.log(`  • ${item}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.errors.length > 0) {
      console.log('❌ DEPLOYMENT BLOCKED: Please fix the errors above before proceeding.');
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('  1. Update secret values with real API keys');
      console.log('  2. Ensure ECR repository exists and has images');
      console.log('  3. Verify IAM permissions');
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('⚠️  DEPLOYMENT ALLOWED WITH WARNINGS: Review warnings above.');
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('  1. Consider addressing warnings for optimal deployment');
      console.log('  2. Ensure you have real API keys in secrets');
    } else {
      console.log('✅ DEPLOYMENT READY: All validations passed!');
    }
    
    console.log('='.repeat(60));
  }
}

// Run validation
const validator = new PreDeploymentValidator();
validator.runAllValidations().catch(error => {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}); 