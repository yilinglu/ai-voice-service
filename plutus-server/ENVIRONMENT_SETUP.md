# Environment Setup Guide - Plutus Server

This document explains how to fix the server startup environment validation errors.

## 🚨 **Current Issue**

The server startup is failing environment validation:
```
❌ Environment validation failed:
  - Missing required environment variable: LAYERCODE_API_KEY
  - Missing required environment variable: LAYERCODE_WEBHOOK_SECRET
  - Missing required environment variable: GOOGLE_GENERATIVE_AI_API_KEY
```

## 🔧 **Quick Fix - Setup Environment Variables**

### **Step 1: Create Environment File**
```bash
# Copy the example file
cp env.example .env.local
```

### **Step 2: Update with Your API Keys**
Edit `.env.local` with your actual API keys:

```env
# Layercode API Configuration
LAYERCODE_API_KEY=your_actual_layercode_api_key_here
LAYERCODE_WEBHOOK_SECRET=your_actual_layercode_webhook_secret_here

# Google AI Configuration  
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_google_ai_api_key_here

# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

## 🔑 **Where to Get API Keys**

### **1. Layercode API Key**
1. Go to [Layercode Dashboard](https://dash.layercode.com)
2. Navigate to **Settings** 
3. Copy your **API Key**

### **2. Layercode Webhook Secret**
1. Go to your [Layercode Pipeline](https://dash.layercode.com/pipelines/)
2. Click on your pipeline
3. In **Webhook Settings**, copy the **Webhook Secret**

### **3. Google AI API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the generated key

## 🧪 **Testing with Placeholder Values**

For initial testing, you can use placeholder values:

```bash
# Create .env.local with test values
cat > .env.local << 'EOF'
LAYERCODE_API_KEY=test-layercode-api-key-placeholder
LAYERCODE_WEBHOOK_SECRET=test-layercode-webhook-secret-placeholder
GOOGLE_GENERATIVE_AI_API_KEY=test-google-ai-api-key-placeholder
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
EOF
```

**⚠️ Note**: With placeholder values, the server will start but API calls will fail.

## ✅ **Verify Setup**

### **Test Environment Validation**
```bash
npm run validate
```

Expected output:
```
✅ Environment validation passed
🎯 Final environment configuration:
  NODE_ENV: development
  LAYERCODE_API_KEY: [SET]
  LAYERCODE_WEBHOOK_SECRET: [SET]
  GOOGLE_GENERATIVE_AI_API_KEY: [SET]
```

### **Start the Server**
```bash
npm run dev
```

Expected output:
```
Checking if port 3000 is available...
✅ Environment validation passed
▲ Next.js 15.3.4
- Local:        http://localhost:3000
- Network:      http://10.0.0.68:3000
✓ Ready in 1157ms
```

## 🔒 **Security Notes**

- **.env.local is gitignored** - Your API keys won't be committed
- **Never commit real API keys** to version control
- **Use environment variables** in production deployments
- **Rotate keys regularly** for security

## 🐛 **Troubleshooting**

### **Environment Variables Not Loading**
```bash
# Check if .env.local exists
ls -la .env.local

# Check file content (without showing secrets)
grep -v "KEY\|SECRET" .env.local
```

### **Still Getting Validation Errors**
```bash
# Clear any cached environment
unset LAYERCODE_API_KEY LAYERCODE_WEBHOOK_SECRET GOOGLE_GENERATIVE_AI_API_KEY

# Restart terminal session
# Try running again
npm run validate
```

### **Port Already in Use**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or use different port
PORT=3001 npm run dev
```

## 🚀 **Development Workflow**

```bash
# 1. Set up environment (one time)
cp env.example .env.local
# Edit .env.local with your API keys

# 2. Validate setup
npm run validate

# 3. Start development server
npm run dev

# 4. Test API endpoints
curl http://localhost:3000/api/health
```

## 📝 **Example Working Configuration**

```env
# .env.local (with real values)
LAYERCODE_API_KEY=lc_api_1234567890abcdef
LAYERCODE_WEBHOOK_SECRET=whsec_1234567890abcdef
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyB1234567890abcdef
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

After creating this file, the server startup will succeed! 🎉 