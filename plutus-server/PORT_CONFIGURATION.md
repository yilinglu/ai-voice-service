# Port Configuration Guide

## 🌐 Port Assignments

| Service | Port | Purpose | Configuration |
|---------|------|---------|---------------|
| **Backend (plutus-server)** | `3000` | API endpoints, webhook handlers | Default Next.js port |
| **Frontend (plutus-frontend)** | `3001` | User interface, Carbon components | Configured in package.json |

## 🚀 Development Workflow

### Starting Services

```bash
# Terminal 1: Start Backend (API server)
cd plutus-server
npm run dev                    # Runs on http://localhost:3000

# Terminal 2: Start Frontend (UI app) 
cd plutus-frontend
npm run dev                    # Runs on http://localhost:3001
```

### Port Customization

```bash
# Backend: Use PORT environment variable
PORT=4000 npm run dev          # Backend on :4000

# Frontend: Update package.json scripts
"dev": "next dev -p 4001"      # Frontend on :4001
```

## 🔗 Service Communication

### API Calls
The frontend communicates with the backend via configured proxy:

```typescript
// Frontend makes calls to /api/* 
// Next.js proxy forwards to http://localhost:3000/api/*
const response = await fetch('/api/health');
```

### Environment Variables
```env
# plutus-frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# plutus-server/.env.local
PORT=3000  # Optional, defaults to 3000
```

## 🔍 Port Validation

Both services include port validation:

```bash
# Backend validation
node scripts/check-port.js     # Checks if port 3000 is available

# Frontend validation  
npm run validate:env           # Checks environment configuration
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find what's using the port
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Service Communication Issues
1. Verify backend is running on 3000
2. Check frontend proxy configuration
3. Confirm CORS settings in backend

## 🌍 Production Deployment

### AWS/Docker
```yaml
# docker-compose.yml
services:
  backend:
    ports: ["3000:3000"]
  frontend:  
    ports: ["3001:3001"]
```

### Load Balancer Setup
```
Internet → ALB (80/443) → Backend (3000)
                        → Frontend (3001)
``` 