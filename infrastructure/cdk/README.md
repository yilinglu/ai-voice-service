# Plutus Infrastructure with AWS CDK

This directory contains the AWS CDK infrastructure code for the Plutus voice agent service. The infrastructure is split into two separate stacks for better management:

## 🏗️ Infrastructure Components

### 1. **Domain Infrastructure Stack** (`DomainInfrastructureStack`)
- **Route53 Hosted Zone** - DNS management for your domain
- **DNSSEC** - DNS Security Extensions for apex domain and all subdomains
- **SSL Certificates** - Automatic certificate creation and renewal
- **KMS Keys** - DNSSEC signing keys with proper IAM policies

### 2. **Application Infrastructure Stack** (`PlutusInfrastructureStack`)
- **VPC** - Virtual Private Cloud with public and private subnets
- **ECS Fargate** - Containerized application deployment
- **Application Load Balancer** - Traffic distribution and SSL termination
- **Auto Scaling** - Automatic scaling based on CPU and memory usage
- **CloudWatch** - Monitoring and logging
- **Secrets Manager** - Secure storage for API keys and secrets

## 🚀 Deployment Strategy

The infrastructure is designed with **separated concerns**:

### **Domain Infrastructure** (Infrequent Changes)
- Deployed once or when adding new domains/subdomains
- Contains Route53, DNSSEC, SSL certificates
- Stable and rarely changes

### **Application Infrastructure** (Frequent Changes)
- Deployed with every application update
- Contains ECS, ALB, auto-scaling, monitoring
- Changes frequently with code updates

## 📋 Prerequisites

1. **AWS CLI** installed and configured
2. **AWS CDK** installed globally: `npm install -g aws-cdk`
3. **Node.js** 18+ and npm
4. **Domain registered** in Route53 (or elsewhere with Route53 hosted zone)

## 🔧 Setup Instructions

### **Step 1: Prepare Domain Setup**

Run the domain preparation script to check your domain setup:

```bash
./scripts/prepare-domain.sh dragon0.com
```

This script will:
- ✅ Check if your domain has a Route53 hosted zone
- ✅ Verify DNS records and name server configuration
- ✅ Check DNSSEC status (will be enabled during deployment)
- ✅ Show a summary of what will be created

### **Step 2: Deploy Domain Infrastructure** (One-time setup)

Deploy the domain infrastructure (Route53, DNSSEC, SSL certificates):

```bash
# Deploy with default settings (dragon0.com, staging/api subdomains)
./scripts/deploy-domain.sh

# Or with custom domain and subdomains
./scripts/deploy-domain.sh mydomain.com dev,staging,prod
```

This creates:
- ✅ Route53 hosted zone configuration
- ✅ DNSSEC enabled for apex domain and all subdomains
- ✅ SSL certificates for all subdomains
- ✅ KMS keys for DNSSEC signing

### **Step 3: Deploy Application Infrastructure** (Frequent deployments)

Deploy the application infrastructure:

```bash
# Deploy staging environment
./scripts/deploy-app.sh staging

# Deploy production environment
./scripts/deploy-app.sh prod
```

This creates:
- ✅ VPC with public/private subnets
- ✅ ECS Fargate service with auto-scaling
- ✅ Application Load Balancer with SSL
- ✅ CloudWatch monitoring and logging
- ✅ DNS records pointing to your application

## 🔐 Security Features

### SSL/TLS Certificates
- Automatic SSL certificate creation and renewal via AWS Certificate Manager
- Certificates are validated using DNS validation for security
- Certificates are automatically attached to the Application Load Balancer

### DNSSEC Support
- **DNSSEC (DNS Security Extensions)** is automatically enabled for the apex domain and all subdomains
- Provides DNS authentication and integrity protection
- Uses AWS KMS for key management with automatic key rotation
- Protects against DNS spoofing and cache poisoning attacks
- All DNS responses are cryptographically signed
- Covers: `dragon0.com`, `staging.dragon0.com`, `api.dragon0.com`

### Network Security
- VPC with private subnets for ECS tasks
- Security groups with minimal required access
- Application Load Balancer in public subnets with SSL termination

## 🔄 Deployment Workflow

### **Initial Setup** (One-time)
```bash
# 1. Prepare domain
./scripts/prepare-domain.sh dragon0.com

# 2. Deploy domain infrastructure
./scripts/deploy-domain.sh

# 3. Deploy application infrastructure
./scripts/deploy-app.sh staging
./scripts/deploy-app.sh prod
```

### **Regular Application Updates** (Frequent)
```bash
# Only deploy application infrastructure
./scripts/deploy-app.sh staging
./scripts/deploy-app.sh prod
```

### **Domain Changes** (Infrequent)
```bash
# Only when adding new domains or subdomains
./scripts/deploy-domain.sh mydomain.com staging,api,admin
```

## 🚀 CI/CD Pipeline (Automated Deployment)

For automated deployments from staging to production, you can deploy the CI/CD pipeline:

### **Pipeline Features**
- **GitHub Integration** - Automatically triggers on code pushes
- **Docker Build** - Builds and pushes Docker images to ECR
- **Staging Deployment** - Automatically deploys to staging environment
- **Manual Approval** - Requires manual approval before production deployment
- **Production Deployment** - Deploys to production after approval

### **Pipeline Flow**
```
Code Push → Build → Deploy to Staging → Manual Approval → Deploy to Production
```

### **Deploy CI/CD Pipeline**

```bash
# Deploy with default settings
./scripts/deploy-pipeline.sh

# Or with custom configuration
./scripts/deploy-pipeline.sh dragon0.com staging api your-github-username ai-voice-service main github/oauth-token
```

### **Setup Requirements**

1. **GitHub OAuth Token**: Create a GitHub personal access token and store it in AWS Secrets Manager
   ```bash
   # Store GitHub token in Secrets Manager
   aws secretsmanager create-secret \
     --name "github/oauth-token" \
     --description "GitHub OAuth token for CI/CD pipeline" \
     --secret-string "your-github-oauth-token"
   ```

2. **Deploy Infrastructure First**: Ensure staging and production infrastructure are deployed before setting up the pipeline
   ```bash
   ./scripts/deploy-app.sh staging
   ./scripts/deploy-app.sh prod
   ```

3. **Push Code**: Once the pipeline is deployed, pushing to the monitored branch will trigger the pipeline

### **Pipeline Benefits**
- ✅ **Automated Testing** - Runs tests before deployment
- ✅ **Consistent Deployments** - Same process for staging and production
- ✅ **Rollback Capability** - Easy to rollback to previous versions
- ✅ **Manual Approval** - Production deployments require approval
- ✅ **Visibility** - Full deployment history and logs

### **Pipeline Monitoring**
- View pipeline status in AWS CodePipeline console
- Monitor build logs in AWS CodeBuild console
- Track deployment progress in real-time

## 📊 Monitoring and Logs

### CloudWatch Dashboard
- CPU and memory utilization
- Request count and response times
- Error rates and availability

### Application Logs
```bash
# View application logs
aws logs tail /aws/ecs/plutus --follow
```

## 🚨 Troubleshooting

### Common Issues

1. **Domain not found**: Ensure your domain has a Route53 hosted zone
2. **SSL certificate validation fails**: Check DNS records are properly configured
3. **ECS service fails to start**: Check Secrets Manager for required API keys
4. **DNSSEC not working**: Verify KMS key permissions and hosted zone configuration

### Verification Commands

```bash
# Check DNSSEC status
aws route53 get-dnssec-status --hosted-zone-id YOUR_ZONE_ID

# Verify DNSSEC on apex domain
dig +dnssec dragon0.com

# Verify DNSSEC on subdomains
dig +dnssec staging.dragon0.com
dig +dnssec api.dragon0.com

# Test application endpoints
curl https://staging.dragon0.com/api/health
curl https://api.dragon0.com/api/health
```

## 📁 Project Structure

```
infrastructure/cdk/
├── bin/
│   ├── domain-infrastructure.ts    # Domain infrastructure app
│   ├── plutus-infrastructure.ts    # Application infrastructure app
│   └── cicd-pipeline.ts            # CI/CD pipeline app
├── lib/
│   ├── domain-infrastructure-stack.ts    # Domain stack (Route53, DNSSEC, SSL)
│   ├── plutus-infrastructure-stack.ts    # Application stack (ECS, ALB, etc.)
│   └── cicd-pipeline.ts                  # CI/CD pipeline stack
├── scripts/
│   ├── prepare-domain.sh           # Domain preparation script
│   ├── deploy-domain.sh            # Domain infrastructure deployment
│   ├── deploy-app.sh               # Application infrastructure deployment
│   ├── deploy-pipeline.sh          # CI/CD pipeline deployment
│   ├── enable-dnssec.sh            # Enable DNSSEC signing
│   └── cleanup-domain.sh           # Cleanup domain infrastructure
└── README.md
```

## 💰 Cost Optimization

- **Domain Infrastructure**: Minimal cost (Route53 hosted zone + DNSSEC)
- **Application Infrastructure**: Scales with usage (ECS, ALB, data transfer)
- **Auto-scaling**: Automatically scales down during low usage
- **Reserved Instances**: Consider for production workloads

## 🔄 CI/CD Integration

The separated infrastructure allows for different CI/CD strategies:

- **Domain changes**: Manual deployment (infrequent, high-risk)
- **Application changes**: Automated deployment (frequent, low-risk)
- **Environment promotion**: Staging → Production with same domain infrastructure