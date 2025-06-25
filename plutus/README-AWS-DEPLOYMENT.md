# AWS CI/CD Deployment Guide for Plutus Voice Agent

This guide will help you deploy your Plutus Voice Agent to AWS using a complete CI/CD pipeline with automated scaling.

## 🏗️ Architecture Overview

```
GitHub → CodePipeline → CodeBuild → ECR → ECS Fargate → ALB → Public API
```

### Components:
- **AWS CodePipeline**: Automated CI/CD pipeline
- **AWS CodeBuild**: Build and test your application
- **Amazon ECR**: Container registry for Docker images
- **Amazon ECS Fargate**: Serverless container orchestration
- **Application Load Balancer**: Public endpoint with health checks
- **Auto Scaling**: Automatic scaling based on CPU/Memory usage
- **AWS Secrets Manager**: Secure storage for API keys
- **CloudWatch**: Logging and monitoring

## 📋 Prerequisites

### Required Tools:
1. **AWS CLI** - [Install Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. **Terraform** - [Install Guide](https://developer.hashicorp.com/terraform/downloads)
3. **Docker** - [Install Guide](https://docs.docker.com/get-docker/)
4. **Git** - [Install Guide](https://git-scm.com/downloads)

### AWS Account Setup:
1. **AWS Account** with appropriate permissions
2. **AWS Credentials** configured (`aws configure`)
3. **GitHub Repository** with your code

## 🚀 Quick Start Deployment

### 1. Clone and Setup

```bash
# Clone your repository
git clone <your-repo-url>
cd ai-voice-service/plutus

# Make deployment script executable
chmod +x scripts/deploy.sh
```

### 2. Configure Environment Variables

```bash
# Set your API keys (optional - can be set manually in AWS Secrets Manager)
export GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"
export LAYERCODE_API_KEY="your-layercode-api-key"
export LAYERCODE_WEBHOOK_SECRET="your-layercode-webhook-secret"
```

### 3. Configure Terraform Variables

```bash
# Copy the example configuration
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# Edit the configuration with your values
nano terraform/terraform.tfvars
```

Update the following values in `terraform/terraform.tfvars`:

```hcl
aws_region = "us-east-1"  # Your preferred AWS region
github_repository = "your-username/ai-voice-service"  # Your GitHub repo
github_branch = "main"  # Branch to deploy
domain_name = "your-domain.com"  # Optional: Your domain
```

### 4. Run Deployment

```bash
# Run the automated deployment script
./scripts/deploy.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Validate AWS credentials
- ✅ Deploy infrastructure with Terraform
- ✅ Store secrets in AWS Secrets Manager
- ✅ Guide you through GitHub connection setup
- ✅ Test the deployment
- ✅ Display deployment information

### 5. Complete GitHub Connection

After the initial deployment, you'll need to authorize the GitHub connection:

1. Go to [AWS CodePipeline Console](https://console.aws.amazon.com/codesuite/codepipeline/)
2. Find the connection with status "Pending"
3. Click on the connection and complete the authorization
4. Run the deployment script again to complete the setup

## 🔧 Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot:

### 1. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Store Secrets

```bash
# Store your API keys in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id "plutus/google-api-key" \
  --secret-string '{"GOOGLE_GENERATIVE_AI_API_KEY":"your-key"}'

aws secretsmanager put-secret-value \
  --secret-id "plutus/layercode-api-key" \
  --secret-string '{"LAYERCODE_API_KEY":"your-key"}'

aws secretsmanager put-secret-value \
  --secret-id "plutus/layercode-webhook-secret" \
  --secret-string '{"LAYERCODE_WEBHOOK_SECRET":"your-secret"}'
```

### 3. Test Deployment

```bash
# Get the ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl http://$ALB_DNS/api/health
```

## 🌐 Accessing Your Application

After successful deployment, you'll get:

- **Load Balancer URL**: `http://your-alb-dns-name.region.elb.amazonaws.com`
- **API Endpoints**:
  - Health Check: `/api/health`
  - Agent Webhook: `/api/agent`
  - Authorize: `/api/authorize`

## 🔄 CI/CD Pipeline

### How It Works:

1. **Source Stage**: Monitors your GitHub repository for changes
2. **Build Stage**: 
   - Builds Docker image
   - Runs tests
   - Pushes to ECR
3. **Deploy Stage**: 
   - Updates ECS service
   - Performs blue-green deployment
   - Health checks ensure zero downtime

### Triggering Deployments:

```bash
# Push to your configured branch to trigger deployment
git add .
git commit -m "Update voice agent"
git push origin main
```

## 📊 Monitoring and Scaling

### Auto Scaling Configuration:
- **Min Capacity**: 1 instance
- **Max Capacity**: 10 instances
- **CPU Threshold**: 70%
- **Memory Threshold**: 70%
- **Scale In Cooldown**: 5 minutes
- **Scale Out Cooldown**: 5 minutes

### Monitoring:
- **CloudWatch Logs**: Application logs
- **CloudWatch Metrics**: CPU, Memory, Request count
- **ALB Access Logs**: HTTP request logs
- **ECS Service Events**: Deployment and scaling events

## 🔒 Security Features

### Network Security:
- **VPC**: Isolated network environment
- **Security Groups**: Restrict traffic to necessary ports
- **Private Subnets**: ECS tasks run in private subnets
- **Public ALB**: Only load balancer is publicly accessible

### Secrets Management:
- **AWS Secrets Manager**: Encrypted storage for API keys
- **IAM Roles**: Least privilege access for ECS tasks
- **No Hardcoded Secrets**: All secrets stored securely

## 🛠️ Troubleshooting

### Common Issues:

#### 1. Build Failures
```bash
# Check CodeBuild logs
aws logs describe-log-groups --log-group-name-prefix "/aws/codebuild/plutus"
```

#### 2. Deployment Failures
```bash
# Check ECS service events
aws ecs describe-services --cluster plutus-cluster --services plutus-service
```

#### 3. Health Check Failures
```bash
# Check application logs
aws logs describe-log-streams --log-group-name "/ecs/plutus-voice-agent"
```

#### 4. GitHub Connection Issues
- Ensure you've completed the GitHub authorization in CodePipeline
- Check that the repository and branch names are correct
- Verify GitHub permissions

### Useful Commands:

```bash
# View infrastructure status
terraform show

# Check ECS service status
aws ecs describe-services --cluster plutus-cluster --services plutus-service

# View recent deployments
aws ecs describe-services --cluster plutus-cluster --services plutus-service --query 'services[0].deployments'

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn $(terraform output -raw target_group_arn)
```

## 🧹 Cleanup

To remove all resources:

```bash
cd terraform
terraform destroy
```

**Warning**: This will delete all AWS resources created by this deployment.

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS CodePipeline Documentation](https://docs.aws.amazon.com/codepipeline/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Layercode Documentation](https://docs.layercode.com/)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review CloudWatch logs for error details
3. Verify all prerequisites are installed
4. Ensure AWS credentials have sufficient permissions

## 📝 Notes

- The deployment creates a new VPC with public and private subnets
- ECS tasks run in private subnets for security
- The ALB is in public subnets for external access
- Auto scaling is enabled by default
- All logs are sent to CloudWatch
- Secrets are stored in AWS Secrets Manager
- The deployment uses blue-green strategy for zero downtime 