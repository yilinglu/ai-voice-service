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
│   ├── terraform/             # Terraform configurations
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
# Navigate to infrastructure
cd infrastructure

# Configure deployment
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform.tfvars with your values

# Run deployment
./scripts/deploy.sh
```

## 📋 Prerequisites

### For Local Development:
- Node.js 18+
- npm or yarn
- API keys for Google Gemini and Layercode

### For Production Deployment:
- AWS CLI configured
- Terraform installed
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

Edit `infrastructure/terraform/terraform.tfvars`:

```hcl
aws_region = "us-east-1"
github_repository = "your-username/ai-voice-service"
github_branch = "main"
```

## 🌐 API Endpoints

- **Health Check**: `GET /api/health`
- **Agent Webhook**: `POST /api/agent`
- **Authorize**: `POST /api/authorize`

## 🔄 CI/CD Pipeline

The project uses AWS CodePipeline for automated deployments:

1. **Source**: Monitors GitHub repository
2. **Build**: Builds Docker image and runs tests
3. **Deploy**: Deploys to ECS with zero downtime

## 📊 Monitoring

- **CloudWatch Logs**: Application and infrastructure logs
- **Health Checks**: Automatic failure detection
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

## 📚 Documentation

- [Application Documentation](plutus/README.md)
- [Infrastructure Documentation](infrastructure/README.md)
- [Layercode Documentation](https://docs.layercode.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.