# Frontend Environment Setup Guide

This document explains the environment variable mechanism for the Plutus Frontend application.

## 🔧 Environment Variable Mechanism

### **1. Next.js Public Variables**
The frontend uses Next.js **`NEXT_PUBLIC_*`** environment variables, which are:
- **Embedded at build time** into the frontend bundle
- **Available in the browser** for client-side code
- **Accessible via `process.env.NEXT_PUBLIC_*`** in React components

### **2. Required Environment Variables**

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_LAYERCODE_PIPELINE_ID` | ✅ **YES** | Your Layercode pipeline ID for voice agent | `e0y2kgye` |
| `NEXT_PUBLIC_API_BASE_URL` | ⚠️ Optional | Backend API URL (defaults to localhost:3000) | `http://localhost:3000` |
| `NEXT_PUBLIC_DEBUG` | ⚠️ Optional | Enable debug logging | `true` |

## 📁 Configuration Files

### **1. Create `.env.local`**
Copy the example and update with your values:

```bash
cp env.example .env.local
```

### **2. Update `.env.local`**
```env
# Required: Get from Layercode Dashboard
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id_here

# Optional: Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# Optional: Debug mode
NEXT_PUBLIC_DEBUG=true
```

## 🚀 Environment Validation

### **Automatic Validation**
The frontend includes automatic environment validation:

```typescript
import { validateFrontendEnvironment, useFrontendConfig } from '@/utils/env-validation';

// In React components
const config = useFrontendConfig();
console.log(config.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID);
```

### **Manual Validation**
Run validation manually:

```bash
# Check environment variables
npm run validate:env

# Run dev with validation
npm run dev:validate

# Build with validation
npm run build:validate
```

## 🔄 How It Works

### **1. Build Time**
- Next.js reads `NEXT_PUBLIC_*` variables from `.env.local`
- Variables are embedded into the JavaScript bundle
- Available in both server-side and client-side code

### **2. Runtime**
- Components access variables via `process.env.NEXT_PUBLIC_*`
- Environment validation runs on app startup
- Errors/warnings logged to console in development

### **3. API Communication**
- Frontend uses `NEXT_PUBLIC_API_BASE_URL` for backend calls
- Next.js proxy configuration forwards `/api/*` to backend
- Authorization endpoint uses pipeline ID for Layercode

## 🛠️ Usage Examples

### **In React Components**
```tsx
import { useFrontendConfig } from '@/utils/env-validation';

export default function VoiceComponent() {
  const config = useFrontendConfig();
  
  const handleAuthorize = async () => {
    const response = await fetch('/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipeline_id: config.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID
      })
    });
    
    const data = await response.json();
    // Handle authorization response
  };
  
  return <button onClick={handleAuthorize}>Start Voice Chat</button>;
}
```

### **Environment Validation**
```typescript
import { validateFrontendEnvironment } from '@/utils/env-validation';

// Check environment on app startup
const validation = validateFrontendEnvironment();

if (!validation.isValid) {
  console.error('Environment errors:', validation.errors);
}
```

## 🌍 Environment-Specific Configuration

### **Development**
```env
# .env.local
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=g0yw0o69  # Staging pipeline
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_DEBUG=true
```

### **Production**
```env
# Set in deployment environment
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=e0y2kgye  # Production pipeline
NEXT_PUBLIC_API_BASE_URL=https://your-backend.com
NEXT_PUBLIC_DEBUG=false
```

## 🔍 Finding Your Pipeline ID

1. Go to [Layercode Dashboard](https://dash.layercode.com)
2. Open your pipeline
3. Look at the URL: `https://dash.layercode.com/pipelines/YOUR_PIPELINE_ID`
4. Copy the pipeline ID from the URL

**Examples:**
- Production: `https://dash.layercode.com/pipelines/e0y2kgye` → `e0y2kgye`
- Staging: `https://dash.layercode.com/pipelines/g0yw0o69` → `g0yw0o69`

## 🚨 Troubleshooting

### **Pipeline ID Not Set**
```
❌ Frontend environment errors: NEXT_PUBLIC_LAYERCODE_PIPELINE_ID is required but not set
```
**Solution:** Add the variable to `.env.local` and restart dev server

### **Authorization Fails**
```
Error: Missing pipeline_id in request body
```
**Solution:** Verify pipeline ID is correctly set and not empty

### **Backend Connection Issues**
```
Network Error: Failed to fetch /api/authorize
```
**Solution:** Check `NEXT_PUBLIC_API_BASE_URL` and ensure backend is running

## 📝 Notes

- **Security**: `NEXT_PUBLIC_*` variables are **exposed to the browser** - never store secrets
- **Build Time**: Changes to environment variables require restarting the dev server
- **Testing**: Jest setup automatically mocks environment variables for tests
- **Deployment**: Set environment variables in your deployment platform (Vercel, AWS, etc.)

## 🔗 Related Files

- `env.example` - Environment variable template
- `src/utils/env-validation.ts` - Validation utility
- `next.config.js` - Next.js configuration with API proxy
- `jest.setup.js` - Test environment setup 