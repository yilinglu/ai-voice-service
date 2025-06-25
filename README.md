# Plutus - Layercode Voice Agent Backend

A Next.js backend server application that integrates with Layercode's voice agent pipeline. Plutus provides a webhook endpoint that receives transcribed messages from users and generates AI responses using Google Gemini.

## Features

- **Layercode Webhook Integration**: Handles incoming webhook requests from Layercode voice pipeline
- **Google Gemini AI**: Uses Google's Gemini Flash 2.0 for intelligent responses
- **Session Management**: Maintains conversation history per session
- **Authorization Endpoint**: Handles client session authorization for Layercode
- **Real-time Streaming**: Streams responses back to Layercode for immediate playback

## Prerequisites

- Node.js 18+
- Layercode account and pipeline
- Google AI API key
- Layercode API key

## Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo>
   cd plutus
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env.local` file in the root directory:
   ```env
   # Layercode Configuration
   LAYERCODE_API_KEY=your_layercode_api_key_here
   LAYERCODE_WEBHOOK_SECRET=your_layercode_webhook_secret_here
   NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id_here

   # Google AI Configuration
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. **Get your API keys**:
   - **Layercode API Key**: Get from [Layercode Dashboard Settings](https://dash.layercode.com/settings)
   - **Layercode Webhook Secret**: Get from your pipeline settings in the Layercode Dashboard
   - **Pipeline ID**: Found in your Layercode pipeline URL
   - **Google AI API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Running the Application

### Development
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production
```bash
npm run build
npm start
```

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

Then use the provided tunnel URL as your webhook endpoint in Layercode.

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
    "turn_id": "turn-456"
  }'
```

### Test the Authorization Endpoint

```bash
curl -X POST http://localhost:3000/api/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_id": "your_pipeline_id"
  }'
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Troubleshooting

### Common Issues

1. **"LAYERCODE_API_KEY is not set"**
   - Ensure your `.env.local` file exists and contains the correct API key

2. **"Invalid signature" errors**
   - Verify your `LAYERCODE_WEBHOOK_SECRET` matches the one in your Layercode pipeline

3. **"GOOGLE_GENERATIVE_AI_API_KEY is not set"**
   - Add your Google AI API key to the environment variables

4. **Webhook not receiving requests**
   - Check that your webhook URL is accessible from the internet
   - Verify the URL in your Layercode pipeline settings

### Logs

Check the console output for detailed error messages and request logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For issues related to:
- **Plutus Backend**: Open an issue in this repository
- **Layercode Platform**: Contact Layercode support
- **Google AI**: Check Google AI documentation

# How to test
Absolutely! You can test your Layercode integration (authorization and webhook security) **without** the Google Generative AI API key. Here’s how:

---

## 1. What Works Without `GOOGLE_GENERATIVE_AI_API_KEY`?

- **/api/authorize**: This endpoint only needs your `LAYERCODE_API_KEY` and will let you test session authorization with Layercode.
- **/api/agent**: You can test signature verification and error handling, but the actual AI response generation will fail or return an error if it tries to use the Google API.

---

## 2. How to Test Layercode Integration

### **A. Test the `/api/authorize` Endpoint**

You can use `curl`, Postman, or your browser (if you have a frontend) to POST to `/api/authorize`:

```bash
curl -X POST http://localhost:3000/api/authorize \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": "your_pipeline_id_here"}'
```

- **Expected result:**  
  You should get a JSON response with a `client_session_key` and `session_id` from Layercode.
- **If you get an error:**  
  Check your `LAYERCODE_API_KEY` and `pipeline_id`.

---

### **B. Test the `/api/agent` Endpoint (Signature Verification)**

You can POST to `/api/agent` with a dummy payload and a fake signature to confirm that signature verification is enforced:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -H "layercode-signature: t=1234567890,v1=invalid_signature" \
  -d '{"text":"Hello","session_id":"test","turn_id":"test","type":"message"}'
```

- **Expected result:**  
  You should get a `401 Unauthorized` response, confirming that signature verification is working.

---

### **C. Health Check**

You can also check `/api/health`:

```bash
curl http://localhost:3000/api/health
```

- **Expected result:**  
  If only the Google API key is missing, you’ll see a health status indicating which variable is missing.

---

## 3. What Will Not Work

- Any actual AI response generation (in `/api/agent`) that requires the Google Generative AI API will fail or return an error until you provide the `GOOGLE_GENERATIVE_AI_API_KEY`.

---

## 4. Summary Table

| Endpoint         | Works Without Google Key? | What It Tests                        |
|------------------|:------------------------:|--------------------------------------|
| `/api/authorize` |           Yes            | Layercode API key, pipeline ID       |
| `/api/agent`     |           Yes*           | Webhook signature verification       |
| `/api/health`    |           Yes            | Env validation, missing Google key   |

\* The endpoint will return 401 for invalid signature, or error if it tries to use Google API.

---

**You can safely test Layercode integration and security before configuring the Google Generative AI API key.**  
Let me know if you want a ready-to-run test script or further guidance!