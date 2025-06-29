# Plutus Voice Agent Platform

A modern voice AI platform with clean separation between frontend and backend applications. Built with Next.js, Carbon Design System, and Layercode voice integration.

## 🏗️ **Project Structure**

```
ai-voice-service/
├── plutus-server/              # Backend API Server
│   ├── src/
│   │   ├── api/
│   │   │   ├── agent/         # Voice agent webhook
│   │   │   │   └── index.ts
│   │   │   ├── authorize/     # Session authorization
│   │   │   └── health/        # Health check endpoint
│   │   └── lib/
│   │       ├── env-validation.ts
│   │       ├── logger.ts
│   │       └── request-logger.ts
│   ├── __tests__/             # Backend tests
│   ├── package.json           # Backend dependencies
│   └── Dockerfile             # Backend containerization
│
├── plutus-frontend/            # Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── voice/         # Voice UI components
│   │   │   ├── chat/          # Chat interface
│   │   │   └── auth/          # Authentication components
│   │   ├── pages/             # Next.js pages
│   │   └── styles/            # Sass/CSS styles
│   ├── package.json           # Frontend dependencies
│   └── next.config.js         # Frontend configuration
│
├── shared/                     # Shared types and utilities
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Shared utility functions
│
├── infrastructure/            # AWS CDK Infrastructure
│   └── cdk/                   # CDK deployment code
│
└── plutus/                    # Legacy combined app (for reference)
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Docker (for deployment)

### **1. Setup Backend Server**
```bash
cd plutus-server
npm install
npm run dev
```
The backend server runs on `http://localhost:3000`

### **2. Setup Frontend Application**
```bash
cd plutus-frontend
npm install
npm run dev
```
The frontend application runs on `http://localhost:3001`

### **3. Environment Configuration**

**Backend (`plutus-server/.env.local`):**
```env
# Layercode Configuration
LAYERCODE_API_KEY=your_layercode_api_key
LAYERCODE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id

# Google AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key

# Server Configuration
NODE_ENV=development
```

**Frontend (`plutus-frontend/.env.local`):**
```env
# Backend API URL
BACKEND_URL=http://localhost:3000

# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_auth0_client_id

# Layercode Pipeline
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id
```

## 🎯 **Key Features**

### **Backend Server (plutus-server)**
- **Voice Agent API**: Webhook endpoint for Layercode voice processing
- **Session Authorization**: Secure client session management
- **AI Integration**: Google Gemini for intelligent responses
- **Enhanced Logging**: Winston-based structured logging
- **Health Monitoring**: Built-in health checks and validation

### **Frontend Application (plutus-frontend)**
- **Carbon Design System**: Enterprise-grade UI components
- **Auth0 SSO**: Secure authentication and user management
- **Voice Interface**: Prominent microphone controls and status indicators
- **MIDI Audio Visualization**: Real-time piano roll-style voice visualization
- **Chat Interface**: Text-based conversation fallback
- **Responsive Design**: Mobile-friendly interface

### **Shared Components**
- **Type Definitions**: Consistent interfaces across frontend/backend
- **Utility Functions**: Reusable helper functions

## 🔧 **Development Workflow**

### **Running Both Applications**
```bash
# Terminal 1: Backend
cd plutus-server && npm run dev

# Terminal 2: Frontend  
cd plutus-frontend && npm run dev
```

### **Testing**
```bash
# Backend tests
cd plutus-server && npm test

# Frontend tests (future)
cd plutus-frontend && npm test
```

### **Linting**
```bash
# Backend
cd plutus-server && npm run lint

# Frontend
cd plutus-frontend && npm run lint
```

## 🚢 **Deployment**

### **Separate Deployment Strategy**

**Backend Deployment:**
```bash
cd plutus-server
docker build -t plutus-server .
# Deploy to your container platform
```

**Frontend Deployment:**
```bash
cd plutus-frontend
npm run build
# Deploy to Vercel/Netlify or container platform
```

### **AWS CDK Deployment**
The infrastructure is designed to support separate deployments:
```bash
cd infrastructure/cdk
./scripts/deploy-backend.sh production
./scripts/deploy-frontend.sh production
```

## 🎨 **UI/UX Features**

### **Voice-First Design**
- **Ultra-low latency** voice interaction
- **Visual feedback** for voice activity
- **MIDI-style visualization** of speech patterns
- **Dual-channel display** (user vs AI voice)

### **Carbon Design System**
- **Accessibility-compliant** components
- **Consistent design language**
- **Enterprise-ready** UI patterns
- **Responsive grid system**

### **Progressive Enhancement**
- **Works without audio** (accessibility)
- **Graceful degradation** for unsupported browsers
- **Mobile-responsive** voice controls

## 📡 **API Integration**

### **Backend API Endpoints**
- `POST /api/agent` - Layercode webhook for voice processing
- `POST /api/authorize` - Client session authorization
- `GET /api/health` - Health check and validation

### **Frontend API Calls**
The frontend communicates with the backend via:
- **API proxying** through Next.js rewrites
- **Environment-based URLs** for different deployment stages
- **Error handling** and retry logic

## 🔒 **Security Features**

### **Backend Security**
- **Webhook signature verification** for Layercode requests
- **Environment variable validation** at startup
- **Request logging** with sensitive data masking
- **AWS Secrets Manager** integration for production

### **Frontend Security**
- **Auth0 SSO integration** for secure authentication
- **API request proxying** to prevent CORS issues
- **Environment variable scoping** (public vs private)

## 🎼 **Audio Visualization**

### **MIDI Piano Roll Features**
- **Real-time pitch detection** from microphone and AI speech
- **Piano roll visualization** with time-based scrolling
- **Dual-channel display** (user in green, AI in blue)
- **Musical note mapping** (frequency → MIDI notes)
- **Smooth canvas rendering** with 60fps updates

### **Technical Implementation**
- **Web Audio API** for microphone capture
- **Canvas-based rendering** for performance
- **Real-time pitch detection** using JavaScript libraries
- **Note quantization** and smoothing options

## 📈 **Monitoring & Analytics**

### **Backend Monitoring**
- **Structured JSON logging** for CloudWatch
- **Request/response timing** metrics
- **Error tracking** with stack traces
- **Health check endpoints** for load balancers

### **Frontend Analytics**
- **User interaction tracking** (future)
- **Voice session metrics** (future)
- **Performance monitoring** (future)

## 🛠️ **Development Tools**

### **Code Quality**
- **TypeScript** for type safety
- **ESLint** for code quality
- **Jest** for testing
- **Prettier** for code formatting (future)

### **Development Experience**
- **Hot reload** for both frontend and backend
- **Environment validation** with helpful error messages
- **Comprehensive logging** for debugging
- **VS Code integration** with recommended extensions

## 🔄 **Migration Guide**

### **From Legacy Plutus App**
The original `plutus/` directory is preserved for reference. To migrate:

1. **Backend**: Code is already moved to `plutus-server/src/`
2. **Frontend**: New Carbon-based UI in `plutus-frontend/src/`
3. **Configuration**: Split environment variables between apps
4. **Tests**: Backend tests moved to `plutus-server/__tests__/`

## 🤝 **Contributing**

### **Development Setup**
1. Clone the repository
2. Install dependencies for both apps
3. Configure environment variables
4. Run both applications in development mode

### **Code Standards**
- Follow TypeScript best practices
- Use Carbon Design System components
- Write tests for new features
- Update documentation for changes

## 📚 **Resources**

- [Carbon Design System](https://carbondesignsystem.com/)
- [Layercode Documentation](https://docs.layercode.com/)
- [Auth0 React SDK](https://auth0.com/docs/libraries/auth0-react)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google AI SDK](https://ai.google.dev/)

---

**Ready to build the future of voice AI interfaces!** 🎤✨