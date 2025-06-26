# AI Voice Service - Plutus

A production-ready voice agent service built with Next.js, integrating with Layercode for real-time voice AI experiences.

## 🏗️ Project Structure

```
ai-voice-service/
├── plutus/                    # Application code
│   ├── app/                   # Next.js application
│   ├── lib/                   # Application libraries
│   ├── Dockerfile             # Container configuration
│   ├── buildspec.yml          # AWS CodeBuild configuration
│   └── package.json           # Application dependencies
├── infrastructure/            # Infrastructure as Code
│   ├── cdk/                   # AWS CDK configurations
│   ├── scripts/               # Deployment scripts
│   └── README.md              # Infrastructure documentation
└── README.md                  # This file
```

## 🚀 Quick Start

### Local Development

```bash
# Navigate to the application
cd plutus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Production Deployment

```bash
# Navigate to CDK infrastructure
cd infrastructure/cdk

# Install dependencies
npm install

# Deploy to development environment
./scripts/deploy.sh dev

# Deploy to production environment
./scripts/deploy.sh prod
```

## 📋 Prerequisites

### For Local Development:
- Node.js 18+
- npm or yarn
- API keys for Google Gemini and Layercode

### For Production Deployment:
- AWS CLI configured
- Node.js 18+ (for CDK)
- Docker installed
- GitHub repository

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the `plutus` directory:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
LAYERCODE_API_KEY=your-layercode-api-key
LAYERCODE_WEBHOOK_SECRET=your-layercode-webhook-secret
```

### Infrastructure Configuration

The CDK infrastructure is configured through TypeScript files in `infrastructure/cdk/`. Key configuration files:

- `lib/plutus-infrastructure-stack.ts` - Main infrastructure stack
- `bin/plutus-infrastructure.ts` - CDK app entry point
- `cdk.json` - CDK configuration

## 🌐 API Endpoints

- **Health Check**: `GET /api/health`
- **Agent Webhook**: `POST /api/agent`
- **Authorize**: `POST /api/authorize`

## 🔄 CI/CD Pipeline

The project uses AWS CDK for infrastructure and supports CI/CD integration:

1. **Infrastructure**: Deployed with AWS CDK
2. **Application**: Containerized with Docker
3. **Deployment**: ECS Fargate with auto-scaling
4. **Monitoring**: CloudWatch dashboards and logs

## 📊 Monitoring

- **CloudWatch Dashboard**: Pre-configured monitoring dashboard
- **ECS Container Insights**: Detailed container performance metrics
- **Load Balancer Metrics**: Request count, response times, error rates
- **Auto Scaling**: Scales based on CPU/Memory usage

## 🛠️ Development

### Running Tests

```bash
cd plutus
npm test
```

### Building for Production

```bash
cd plutus
npm run build
```

### Docker Build

```bash
cd plutus
docker build -t plutus-voice-agent .
```

### Infrastructure Development

```bash
cd infrastructure/cdk

# Synthesize CloudFormation template
npx cdk synth

# Show differences
npx cdk diff

# Deploy to development
npx cdk deploy PlutusInfrastructureStack-dev
```

## 🔒 Security Features

- **Private Subnets**: Application runs in private subnets
- **IAM Roles**: Least privilege access for ECS tasks
- **Secrets Manager**: Encrypted storage for API keys
- **Security Groups**: Network-level security controls
- **HTTPS**: Load balancer supports HTTPS (with certificate)

## 💰 Cost Optimization

- **Fargate Spot**: Optional spot instances for cost savings
- **Auto Scaling**: Scales down during low usage
- **Single NAT Gateway**: Cost-optimized VPC design
- **Resource Sizing**: Environment-specific resource allocation

### Estimated Monthly Costs (us-east-1)
- **Development**: ~$50-100/month
- **Production**: ~$200-500/month (depending on usage)

## 📚 Documentation

- [Application Documentation](plutus/README.md)
- [Infrastructure Documentation](infrastructure/README.md)
- [Layercode Documentation](https://docs.layercode.com/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Test infrastructure changes locally with `npx cdk synth`
6. Submit a pull request

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

### Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster plutus-cluster-dev --services plutus-service-dev

# View CloudWatch logs
aws logs tail /aws/ecs/plutus --follow

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## 📄 License

This project is licensed under the MIT License.