# Plutus Voice Agent

A Next.js backend server application that integrates with Layercode's voice agent pipeline. Plutus provides webhook endpoints that receive transcribed messages from users and generate AI responses using Google Gemini.

## Features

- **Layercode Webhook Integration**: Handles incoming webhook requests from Layercode voice pipeline
- **Google Gemini AI**: Uses Google's Gemini Flash 2.0 for intelligent responses
- **Session Management**: Maintains conversation history per session
- **Authorization Endpoint**: Handles client session authorization for Layercode
- **Real-time Streaming**: Streams responses back to Layercode for immediate playback
- **Enhanced Logging**: Structured logging with Winston and request tracking
- **Health Monitoring**: Built-in health checks for monitoring

## Prerequisites

- Node.js 18+
- Layercode account and pipeline
- Google AI API key
- Layercode API key

## Local Development

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env.local` file:
   ```env
   # Layercode Configuration
   LAYERCODE_API_KEY=your_layercode_api_key_here
   LAYERCODE_WEBHOOK_SECRET=your_layercode_webhook_secret_here
   NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id_here

   # Google AI Configuration
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

   # Server Configuration
   # PORT=3000  # Uncomment and set to change the server port (default: 3000)
   NODE_ENV=development
   ```

3. **Get your API keys**:
   - **Layercode API Key**: Get from [Layercode Dashboard Settings](https://dash.layercode.com/settings)
   - **Layercode Webhook Secret**: Get from your pipeline settings in the Layercode Dashboard
   - **Pipeline ID**: Found in your Layercode pipeline URL
   - **Google AI API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Configuring the Server Port

The server port can be configured using the `PORT` environment variable. By default, the application will use port 3000. If you want to use a different port, set `PORT` in your `.env.local` or in your shell before running the server:

```env
# .env.local
PORT=4000
```

Or when running the command:

```bash
PORT=4000 npm run dev
```

> **Note:** The port is checked before startup. If the port is already in use, the server will not start and you will see a clear error message.

### Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Testing
npm test
```

The server will start on `http://localhost:<PORT>` (default: 3000)

## API Endpoints

### 1. Webhook Endpoint (`POST /api/agent`)

Handles incoming webhook requests from Layercode. This endpoint:
- Verifies webhook signatures for security
- Processes user messages and generates AI responses
- Streams responses back to Layercode
- Maintains conversation history

**Request Format**:
```json
{
  "text": "User's transcribed message",
  "type": "message",
  "session_id": "unique_session_id",
  "turn_id": "unique_turn_id"
}
```

### 2. Authorization Endpoint (`POST /api/authorize`)

Handles client session authorization for Layercode frontend SDKs.

**Request Format**:
```json
{
  "pipeline_id": "your_pipeline_id"
}
```

**Response Format**:
```json
{
  "client_session_key": "session_key_for_frontend",
  "session_id": "unique_session_id"
}
```

### 3. Health Check (`GET /api/health`)

Returns the health status of the application and validates environment variables.

## Layercode Integration

### 1. Configure Your Layercode Pipeline

1. Go to your [Layercode Dashboard](https://dash.layercode.com)
2. Open your pipeline
3. Click "Connect Your Backend"
4. Set the Webhook URL to: `https://your-domain.com/api/agent`
5. Copy the Webhook Secret and add it to your `.env.local` file

### 2. For Local Development

If running locally, you'll need to expose your server to the internet using a tunnel:

```bash
# Using cloudflared (recommended)
npx cloudflared tunnel --url http://localhost:3000
```

Use the provided tunnel URL as your webhook endpoint in Layercode.

## Customization

### Modifying the AI Personality

Edit the `SYSTEM_PROMPT` in `app/api/agent/route.ts` to change Plutus's personality and behavior:

```typescript
const SYSTEM_PROMPT = `You are Plutus, a helpful and intelligent voice assistant...`;
```

### Adding Custom Logic

You can add custom business logic in the webhook handler:

```typescript
// Add your custom logic here
if (text.includes('weather')) {
  // Handle weather queries
  stream.tts("I can help you with weather information!");
  return;
}
```

### Database Integration

For production, replace the in-memory session storage with a database:

```typescript
// Replace this:
const sessionMessages: Record<string, CoreMessage[]> = {};

// With database calls:
const messages = await getSessionMessages(session_id);
await saveSessionMessages(session_id, messages);
```

## Testing

### Test the Webhook Endpoint

Use the built-in test interface at `http://localhost:3000` or test directly:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -H "layercode-signature: test-signature" \
  -d '{
    "text": "Hello, how are you?",
    "type": "message",
    "session_id": "test-123",
    "turn_id": "turn-123"
  }'
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with coverage summary
npm run test:coverage:summary
```

## Production Deployment

### AWS CDK Deployment

The application is designed to be deployed using AWS CDK. See the [Infrastructure Documentation](../infrastructure/README.md) for detailed deployment instructions.

**Quick Deployment**:
```bash
# Navigate to CDK infrastructure
cd ../infrastructure/cdk

# Deploy to development environment
./scripts/deploy.sh dev

# Deploy to production environment
./scripts/deploy.sh prod
```

### Docker Deployment

The application includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t plutus-voice-agent .

# Run the container
docker run -p 3000:3000 \
  -e LAYERCODE_API_KEY=your_key \
  -e LAYERCODE_WEBHOOK_SECRET=your_secret \
  -e GOOGLE_GENERATIVE_AI_API_KEY=your_key \
  plutus-voice-agent
```

### Environment Variables for Production

For production deployment, ensure these environment variables are set:

```env
# Required
LAYERCODE_API_KEY=your_layercode_api_key
LAYERCODE_WEBHOOK_SECRET=your_layercode_webhook_secret
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Optional
NODE_ENV=production
PORT=3000
```

## Monitoring and Logging

### Logging

The application uses Winston for structured logging:

- **Request Logging**: All API requests are logged with timing and status
- **Error Logging**: Errors are logged with stack traces
- **Environment Validation**: Startup validation is logged

### Health Monitoring

The `/api/health` endpoint provides:

- Application status
- Environment variable validation
- Response time metrics

### CloudWatch Integration

When deployed on AWS, logs are automatically sent to CloudWatch:

- **Log Group**: `/aws/ecs/plutus`
- **Retention**: 1 month (configurable)
- **Metrics**: CPU, memory, request count

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Environment Variables Missing**
   - Check `.env.local` file exists
   - Verify all required variables are set
   - Restart the development server

3. **Layercode Webhook Failures**
   - Verify webhook secret is correct
   - Check webhook URL is accessible
   - Review application logs for errors

4. **Google AI API Errors**
   - Verify API key is valid
   - Check API quota and billing
   - Review error messages in logs

### Debug Mode

Enable debug logging by setting the log level:

```env
LOG_LEVEL=debug
```

## Performance Optimization

### Production Recommendations

1. **Database**: Use a persistent database for session storage
2. **Caching**: Implement Redis for session caching
3. **CDN**: Use CloudFront for static assets
4. **Monitoring**: Set up CloudWatch alarms for errors and performance

### Scaling

The application is designed to scale horizontally:

- **Stateless**: No local state dependencies
- **Session Storage**: Can be moved to external database
- **Load Balancing**: Supports multiple instances
- **Auto Scaling**: Configured in AWS CDK infrastructure

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License. 