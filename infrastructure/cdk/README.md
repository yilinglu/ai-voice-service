# Plutus Voice Agent - AWS CDK Infrastructure

This directory contains the AWS CDK infrastructure code for deploying the Plutus voice agent service on AWS. The infrastructure is designed to be production-ready, scalable, and cost-effective.

## 🏗️ Architecture Overview

The CDK infrastructure creates a complete AWS environment with the following components:

### Core Infrastructure
- **VPC** - Isolated network with public and private subnets across 2 AZs
- **ECS Fargate** - Serverless container hosting for the Plutus application
- **Application Load Balancer** - Traffic distribution and health checks
- **Auto Scaling** - Dynamic scaling based on CPU and memory utilization
- **Secrets Manager** - Secure storage for API keys and sensitive data

### Monitoring & Observability
- **CloudWatch Dashboard** - Real-time metrics and monitoring
- **ECS Container Insights** - Detailed container performance metrics
- **Load Balancer Metrics** - Request count, response times, error rates

### Security
- **Private Subnets** - Application runs in private subnets for security
- **IAM Roles** - Least privilege access for ECS tasks
- **Security Groups** - Network-level security controls
- **Secrets Manager** - Encrypted storage of sensitive data

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** - Configured with appropriate permissions
2. **Node.js** - Version 18 or higher
3. **AWS CDK** - Will be installed automatically
4. **Docker** - For building the application container

### Installation

1. **Navigate to the CDK directory:**
   ```bash
   cd infrastructure/cdk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Deploy to development environment:**
   ```bash
   ./scripts/deploy.sh dev
   ```

### Environment Options

- `dev` - Development environment (1 instance, minimal resources)
- `staging` - Staging environment (2 instances, production-like)
- `prod` - Production environment (2+ instances, full resources)

## 📋 Deployment Process

### 1. Bootstrap CDK (First Time Only)

If this is your first time using CDK in your AWS account:

```bash
npx cdk bootstrap
```

### 2. Deploy Infrastructure

```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to production
./scripts/deploy.sh prod
```

### 3. Configure Secrets

After deployment, update the secrets in AWS Secrets Manager:

1. Navigate to AWS Secrets Manager in the console
2. Find the secret named `plutus-app-secrets-{environment}`
3. Update the following values:
   - `LAYERCODE_API_KEY` - Your Layercode API key
   - `LAYERCODE_WEBHOOK_SECRET` - Your Layercode webhook secret
   - `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key

### 4. Configure Layercode Pipeline

1. Go to your Layercode dashboard
2. Edit your pipeline's backend configuration
3. Set the webhook URL to: `http://{load-balancer-dns}/api/agent`

## 🔧 Infrastructure Components

### VPC Configuration
- **2 Availability Zones** for high availability
- **Public Subnets** for load balancer
- **Private Subnets** for ECS tasks (security)
- **Single NAT Gateway** for cost optimization

### ECS Fargate Service
- **CPU**: 512 units (0.5 vCPU)
- **Memory**: 1024 MB
- **Health Checks**: HTTP endpoint at `/api/health`
- **Logging**: CloudWatch Logs with 1-month retention

### Auto Scaling
- **CPU Scaling**: Scale up at 70% CPU utilization
- **Memory Scaling**: Scale up at 80% memory utilization
- **Scale Cooldown**: 60 seconds between scaling actions
- **Capacity**: 1-3 instances (dev) / 2-10 instances (prod)

### Load Balancer
- **Health Check Path**: `/api/health`
- **Health Check Interval**: 30 seconds
- **Unhealthy Threshold**: 3 consecutive failures
- **Healthy Threshold**: 2 consecutive successes

## 📊 Monitoring

### CloudWatch Dashboard

The infrastructure automatically creates a CloudWatch dashboard with:

- **ECS Service Metrics**
  - CPU utilization
  - Memory utilization
  - Running task count

- **Load Balancer Metrics**
  - Request count
  - Response time
  - Error rates (4xx, 5xx)

### Logs

- **ECS Logs**: Available in CloudWatch Logs under `/aws/ecs/plutus`
- **Load Balancer Logs**: Access logs can be enabled for detailed request tracking

## 🔒 Security

### Network Security
- ECS tasks run in private subnets
- Load balancer in public subnets
- Security groups restrict traffic to necessary ports only

### IAM Security
- **Execution Role**: Minimal permissions for ECS task execution
- **Task Role**: Permissions for CloudWatch logging
- **Secrets Access**: Encrypted access to sensitive data

### Data Security
- All secrets stored in AWS Secrets Manager
- Secrets are encrypted at rest and in transit
- No sensitive data in environment variables

## 💰 Cost Optimization

### Resource Sizing
- **Development**: Minimal resources (1 instance, 0.5 vCPU, 1GB RAM)
- **Production**: Optimized for performance and reliability

### Cost-Saving Features
- **Single NAT Gateway**: Reduces NAT gateway costs
- **Fargate Spot** (optional): Can be enabled for additional cost savings
- **Auto Scaling**: Scales down during low usage periods

### Estimated Costs (us-east-1)
- **Development**: ~$50-100/month
- **Production**: ~$200-500/month (depending on usage)

## 🛠️ Management Commands

### CDK Commands

```bash
# Synthesize CloudFormation template
npx cdk synth

# Deploy all stacks
npx cdk deploy --all

# Deploy specific stack
npx cdk deploy PlutusInfrastructureStack-dev

# Destroy infrastructure
npx cdk destroy --all

# Show differences
npx cdk diff

# List all stacks
npx cdk list
```

### AWS CLI Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster plutus-cluster-dev --services plutus-service-dev

# View CloudWatch logs
aws logs tail /aws/ecs/plutus --follow

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## 🔄 CI/CD Integration

The infrastructure is designed to support CI/CD pipelines. You can extend the CDK code to include:

- **CodePipeline** for automated deployments
- **CodeBuild** for building and testing
- **GitHub integration** for source control
- **Approval gates** for production deployments

## 🚨 Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**
   ```bash
   npx cdk bootstrap
   ```

2. **Insufficient IAM Permissions**
   - Ensure your AWS user/role has necessary permissions
   - Check CloudFormation, ECS, VPC, and IAM permissions

3. **Container Health Check Failures**
   - Verify the `/api/health` endpoint is working
   - Check application logs in CloudWatch

4. **Secrets Not Loading**
   - Verify secrets are properly configured in Secrets Manager
   - Check IAM permissions for secrets access

### Debug Commands

```bash
# Check ECS task logs
aws logs describe-log-groups --log-group-name-prefix /aws/ecs/plutus

# View task definition
aws ecs describe-task-definition --task-definition plutus-task-def

# Check load balancer target health
aws elbv2 describe-target-health --target-group-arn <arn>
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Fargate Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Application Load Balancer Guide](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [CloudWatch Monitoring](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)

## 🤝 Contributing

When making changes to the infrastructure:

1. **Test locally** with `npx cdk synth`
2. **Review changes** with `npx cdk diff`
3. **Deploy to dev** first: `./scripts/deploy.sh dev`
4. **Test thoroughly** before deploying to production
5. **Update documentation** for any new features

## 📄 License

This infrastructure code is part of the Plutus voice agent project and follows the same license terms. 