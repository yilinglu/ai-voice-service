# Frontend WebSocket API
Source: https://docs.layercode.com/api-reference/frontend_ws_api

Layercode WebSocket API for browser and mobile based voice agent experiences.

The Layercode Frontend WebSocket API is used to create browser and mobile based voice agent experiences. The client browser streams chunks of base64 microphone audio down the WebSocket. In response, the server returns audio chunks of the assistant's response to be played to the user. Additional trigger and data event types allow control of turns and UI updates.

> **Note**: For most use cases, we recommend using our SDKs for React ([React Guide](/frontend-guides/react)) or Vanilla JS ([Vanilla JS Guide](/frontend-guides/vanilla_js)). This API reference is intended for advanced users who need to implement the WebSocket protocol directly.

# Connecting to the WebSocket

The client browser connects to the Layercode WebSocket API at the following URL:

```
wss://api.layercode.com/v1/pipelines/websocket
```

## Authorizing the WebSocket Connection

When establishing the WebSocket connection, the following query parameter must be included in the request URL:

* `client_session_key`: A unique session key obtained from the Layercode REST API `/authorize` endpoint.

Example full connection URL:

```
wss://api.layercode.com/v1/pipelines/websocket?client_session_key=your_client_session_key
```

To obtain a client\_session\_key, you must first create a new session for the user by calling the [Layercode REST API /authorize](/api-reference/rest-api#authorize) endpoint. This endpoint returns a client\_session\_key which must be included in the WebSocket connection parameters. This API call should be made from your backend server, not the client browser. This ensures your LAYERCODE\_API\_KEY is never exposed to the client, and allows you to do any additional user authorization checks required by your application.

# WebSocket Events

## Client → Server Messages

### Client Ready

When the client has established the WebSocket connection and is ready to begin streaming audio, it should send a ready message:

```json
{ "type": "client.ready" }
```

### Audio Streaming

At WebSocket connection, the client should constantly send audio chunks of the user's microphone in the format below. The content must be the following format:

* Base64 encoded
* 16-bit PCM audio data
* 8000 Hz sample rate
* Mono channel

See the [Vanilla JS SDK code](https://github.com/layercodedev/packages-and-docs/tree/main/packages/layercode-js-sdk/src) for an example of how browser microphone audio is correctly encoded to base64.

```json
{ "type": "client.audio", "content": "base64audio" }
```

### Voice Activity Detection Events

The client can send Voice Activity Detection (VAD) events to inform the server about speech detection. This will improve the speed and accuracy of automatic turn taking:

VAD detects voice activity:
Note: The client is responsible for stopping any in-progress assistant audio playback when the user interrupts.

```json
{
  "type": "vad_events",
  "event": "vad_start"
}
```

Detected voice activity ends:

```json
{
  "type": "vad_events",
  "event": "vad_end"
}
```

Client could not load the VAD model, so VAD events won't be sent:

```json
{
  "type": "vad_events",
  "event": "vad_model_failed"
}
```

### Response Audio Replay Finished

The client will receive audio chunks of the assistant's response (see [Audio Response](#audio-response)). When the client has finished replaying all assistant audio chunks in its buffer it must reply with 'client.response\_audio\_replay\_finished' Note that the assistant webhook can return response.tts events (which are turned into speech and received by the client as response.audio events) at any point during a long response (in between other text or json events), so the client must handle situations where it's played all the audio in the buffer, but then receives more to play. This will result in the client sending multiple 'trigger.response.audio.replay\_finished' completed events over a single turn.

```json
{
  "type": "trigger.response.audio.replay_finished",
  "reason": "completed",
  "turn_id": "UUID of assistant response"
}
```

### Push-to-Talk Control (Optional)

In push-to-talk mode (read more about [Turn Taking](/voice-guides/turn-taking)), the client must send the following events to start and end a user turn to speak. This is typically connected to a button which is held down for the user to speak. In this mode, the client can also pre-emptively halt the assistant response audio playback when the user interrupts (instead of having to wait to receive a turn.end event), a trigger.audio.replay\_finished event should also be sent when the user interrupts the assistant response.

Start user turn (user has pressed the button):

```json
{ "type": "trigger.turn.start", "role": "user" }
```

End user turn (user has released the button):

```json
{ "type": "trigger.turn.end", "role": "user" }
```

## Server → Client Messages

The client will receive the following events from Layercode:

### Turn Management

When the server detects the start of the user's turn:

```json
{ "type": "turn.start", "role": "user", "turn_id": "UUID of user turn" }
```

When the end of the user turn is detected:

```json
{ "type": "turn.end", "role": "user", "turn_id": "UUID of user turn" }
```

When it's the assistant's turn:

```json
{ "type": "turn.start", "role": "assistant", "turn_id": "UUID of assistant turn" }
```

Or end of assistant turn:

```json
{ "type": "turn.end", "role": "assistant", "turn_id": "UUID of assistant turn" }
```

### Audio Response

The client will receive audio chunks of the assistant's response, which should be buffered and played immediately.

The content will be audio in the following format:

* Base64 encoded
* 16-bit PCM audio data
* 16000 Hz sample rate
* Mono channel

See the [Vanilla JS SDK code](https://github.com/layercodedev/packages-and-docs/tree/main/packages/layercode-js-sdk/src) for an example of how to play the audio chunks.

```json
{
  "type": "response.audio",
  "content": "base64audio",
  "delta_id": "UUID unique to each delta msg",
  "turn_id": "UUID of assistant response turn"
}
```

### Text Response

The client will receive text chunks of the assistant's response for display or processing:

```json
{
  "type": "response.text",
  "content": "Text content from assistant",
  "turn_id": "UUID of assistant response turn"
}
```

### Data and State Updates

Your Webhook can return response.data SSE events, which will be forwarded to the browser client. This is ideal for updating UI and state in the browser. If you want to pass text or json deltas instead of full objects, you can simply pass a json object like `{ "delta": "text delta..." }` and accumulate and render the delta in the client browser.

```json
{
  "type": "response.data",
  "content": { "json": "object" },
  "turn_id": "UUID of assistant response"
}
```

# Introduction
Source: https://docs.layercode.com/api-reference/introduction

Layercode API Reference

* **[Frontend WebSocket API](/api-reference/frontend_ws_api) (for building web and mobile voice AI applications):** Enables seamless connection between your frontend applications and Layercode's real-time pipelines. Use this API with our Frontend SDKs to stream audio and receive responses.
* **[Webhook SSE API](/api-reference/webhook_sse_api) (for connecting your own backend to Layercode):** This is a webhook endpoint you implement in your backend, to receive transcriptions from the user, then respond with SSE messages containing text to be converted to speech and spoken to the user.

# REST API (Authorize Client Session)
Source: https://docs.layercode.com/api-reference/rest_api

API reference for the Layercode REST API.

# Authorize Client Session

To connect a client (browser or mobile app) to a Layercode voice pipeline, you must first authorize the session. This is done by calling the Layercode REST API endpoint below from your backend.

**How the authorization flow works:**\
When using a Layercode frontend SDK (such as `@layercode/react-sdk` or `@layercode/js-sdk`), the SDK will automatically make a POST request to the `authorizeSessionEndpoint` URL that you specify in your frontend code.

This `authorizeSessionEndpoint` should be an endpoint on **your own backend** (not Layercode's). Your backend receives this request from the frontend, then securely calls the Layercode REST API (`https://api.layercode.com/v1/pipelines/authorize_session`) using your `LAYERCODE_API_KEY`. Your backend then returns the `client_session_key` to the frontend.

> **Check**: Once your frontend receives the `client_session_key`, it can connect to the Layercode WebSocket API to start streaming audio.

> **Info**: Your Layercode API key should **never** be exposed to the frontend. Always call this endpoint from your backend, then return the `client_session_key` to your frontend.

## Endpoint

```http
POST https://api.layercode.com/v1/pipelines/authorize_session
```

## Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Authorization | string | Yes | Bearer token using your `LAYERCODE_API_KEY`. |
| Content-Type | string | Yes | Must be `application/json`. |
## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pipeline_id | string | Yes | The ID of the Layercode pipeline the client should connect to. |
| session_id | string | No | (Optional) The session ID to resume an existing session. If not provided, a new session will be created. |
## Response

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_session_key | string | Yes | The key your frontend uses to connect to the Layercode WebSocket API. |
| session_id | string | Yes | The unique session ID for this conversation. |
## Example Request

```bash
# Example with only pipeline_id (creates a new session)
curl -X POST https://api.layercode.com/v1/pipelines/authorize_session \
  -H "Authorization: Bearer $LAYERCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": "pl-123456"}'

# Example with pipeline_id and session_id (resumes an existing session)
curl -X POST https://api.layercode.com/v1/pipelines/authorize_session \
  -H "Authorization: Bearer $LAYERCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": "pl-123456", "session_id": "lc_session_abc123..."}'
```

## Example Response

```json
{
  "client_session_key": "lc_sesskey_abc123...",
  "session_id": "lc_session_abc123..."
}
```

## Error Responses

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| error | string | Yes | Error message describing the problem. |
**Possible error cases:**

* `400` – Invalid or missing bearer token, invalid pipeline ID, missing or invalid session ID.
* `402` – Insufficient balance for the organization.

**Example error response:**

```json
{
  "error": "insufficient balance"
}
```

## Example: Backend Endpoint (Next.js)

Here's how you might implement an authorization endpoint in your backend (Next.js example):

```ts Next.js app/api/authorize/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  // Here you could do any user authorization checks you need for your app
  const endpoint = "https://api.layercode.com/v1/pipelines/authorize_session";
  const apiKey = process.env.LAYERCODE_API_KEY;
  if (!apiKey) {
    throw new Error("LAYERCODE_API_KEY is not set.");
  }
  const requestBody = await request.json();
  if (!requestBody || !requestBody.pipeline_id) {
    throw new Error("Missing pipeline_id in request body.");
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
    return NextResponse.json(await response.json());
  } catch (error: any) {
    console.log("Layercode authorize session response error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
```

> **Info**: For other backend frameworks (Express, FastAPI, etc.), the logic is the same: receive a request from your frontend, call the Layercode `authorize_session` endpoint with your API key, and return the `client_session_key` to your frontend.

> **Check**: Once your frontend receives the `client_session_key`, it can connect to the Layercode WebSocket API to start streaming audio.

# Webhook SSE API
Source: https://docs.layercode.com/api-reference/webhook_sse_api

Webhook SSE API

When using the [Hosted Backend](/backend-guides/hosted-backend) on every complete user conversation turn, the server sends a webhook to the webhook URL provided in the Pipeline configuration (set in the Layercode Dashboard).

## Webhook Request Payload

The webhook request body contains a JSON object with the following fields:

| Field           | Type   | Description                                                                                                    |
| --------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `text`          | string | The transcribed text from the user's speech                                                                    |
| `connection_id` | string | A unique identifier for the current connection. This changes each time the user reconnects to the same session |
| `session_id`    | string | A unique identifier for the current session                                                                    |
| `type`          | string | The type of webhook event. Can be "MESSAGE" for regular turns or "SESSION\_START" for session initialization   |
| `turn_id`       | string | A unique identifier for the current conversation turn                                                          |
Example webhook request JSON payload:

```json
{
  "text": "Hello, how are you?",
  "connection_id": "conn_abc123",
  "session_id": "sess_xyz789",
  "type": "MESSAGE",
  "turn_id": "turn_xyz123"
}
```

### Verifying the webhook request

To confirm that webhook requests are from Layercode you should always [verify the webhook request](/backend-guides/connect-backend#webhook-verification).

## Webhook SSE Response Format

Your response should be a stream of SSE events.
The SSE stream format is JSON based. Each JSON message below must be sent as a separate SSE event in the format below. Each SSE event consists of a `data: ` field, followed by a stringified JSON object and two newlines (`\n\n`).

### Event Types

**Text to speech**

Send any number of `response.tts` type events to the client containing text, which the Layercode voice pipeline will convert to speech and send to the client as `response.audio` events. The text will be processed in sentence chunks for natural speech delivery.

```json
{
  "type": "response.tts",
  "content": "Hello this is a complete text message to speak to the user",
  "turn_id": "turn_xyz123"
}
```

**JSON data to forward to the client**

Your webhook SSE can return response.data type events, which will be forwarded directly to the browser client. This is ideal for updating UI and state in the browser. If you want to pass text or json deltas instead of full objects, you can simply pass a json object like `{ "delta": "text delta..." }` and accumulate and render the delta in the client browser.

```json
{
  "type": "response.data",
  "content": { "json": "object" },
  "turn_id": "turn_xyz123"
}
```

Note: Multiple `response.tts` and `response.data` messages can be sent over a single SSE response (e.g. so the agent can say "I'm just getting your results", do a tool call, return the results in response.data, and then speak a summary of the results).

**Ending the SSE response**

Once the webhook SSE response is ready to be closed, you must send the following final event:

```json
{
  "type": "response.end",
  "turn_id": "turn_xyz123"
}
```

# Connect Your Backend
Source: https://docs.layercode.com/backend-guides/connect-backend

How to connect your own agent backend to a Layercode pipeline.

Layercode is designed for maximum flexibility: you can connect any backend that can receive an HTTP request and return a Server-Sent Events (SSE) stream.
This allows you to use your own LLM-powered agent, business logic, or orchestration—while Layercode handles all the real-time voice infrastructure.

> **Note**: You don't have to integrate your own backend. In some cases, our [Hosted Backend](/backend-guides/hosted-backend) will be sufficient to power your voice agent.

## How it works

By default, Layercode pipelines use our **Hosted Backend** (powered by Gemini Flash 2.0). To use your own backend, click the "Connect Your Backend" button on your pipeline, and then set the **Webhook URL** to point to your backend's endpoint.

When a user interacts with your voice agent, Layercode will:

1. Transcribe the user's speech to text.
2. Send an HTTP POST request to your backend at the Webhook URL you provide.
3. Your backend responds with a Server-Sent Events (SSE) stream containing the agent's reply (text to be spoken, and optional data).
4. Layercode handles converting the text in your response to speech and streaming it back to the user in real time.
5. Return of JSON data is also supported to allow you to pass state back to your UI.

> **Note**: See our [Backend Guides](#backend-guides) for full code examples of how to implement your webhook endpoint.

## Configuring Your Pipeline

1. In the Layercode dashboard, open your pipeline and click **Connect Your Backend** (or click the edit button in the Your Backend box if you've already connected your backend previously).
2. Enter your backend's **Webhook URL** in the configuration modal.
3. Optionally, configure which webhook events you want to receive (see below).
4. Save your changes.

## Webhook Events

* **message** (required):\
  Sent when the user finishes speaking. Contains the transcribed message and metadata. Your backend should respond with an SSE stream containing the agent's reply.
* **session.start** (optional):\
  Sent when a new session is started (e.g., when a user connects). Use this to have your agent start the conversation. If disabled, the agent will wait for the user to speak first when a new session is started.

## Webhook Verification

To ensure the security of your backend, it's crucial to verify that incoming requests are indeed from Layercode. This can be done by verifying the `layercode-signature` header, which contains a timestamp and a HMAC-SHA256 signature of the request body.

Here's how you can verify the signature in your backend:

1. Retrieve the `layercode-signature` header from the request. It will be in the format: `t=timestamp,v1=signature`.
2. Get your Layercode webhook secret from the Layercode dashboard (found by going to the appropriate pipeline and clicking the edit button in the Your Backend box, where you'll find the Webhook Secret).
3. Reconstruct the signed payload by concatenating the timestamp, a period (`.`), and the exact raw webhook request body: `signed_payload = timestamp + "." + request_body`.
4. Compute the HMAC-SHA256 signature of this signed payload using your webhook secret.
5. Compare the computed signature with the `v1` value from the `layercode-signature` header. If they match, the request is valid.
6. (Recommended) Check that the timestamp is recent (for example, within 5 minutes) to prevent replay attacks.

See the example code snippets in our [Backend Guides](#backend-guides) for framework-specific implementations.

## Example: Webhook Request

When a user finishes speaking, Layercode will send a POST request to your webhook with the following JSON payload body:

```json
{
  "type": "message", // The type of webhook event: message or session.start
  "session_id": "uuid", // Session ID is unique per conversation. Use this to know which conversation a webhook belongs to.
  "turn_id": "uuid", // Turn ID is unique per turn of the conversation. This ID must be returned in all SSE events. It is unique per turn of the conversation.
  "text": "What's the weather today?" // The user's transcribed message
}
```

See the [Webhook SSE API documentation](/api-reference/webhook_sse_api) for details

## Example: SSE Response

Your backend should respond with an SSE stream. Each SSE message contains a JSON payload with the following fields: `type`, `content` (when required) and `turn_id`. See the [Webhook SSE API documentation](/api-reference/webhook_sse_api) for details.

Below is a simple example where we respond with a static text SSE event, which will be converted to speech and spoken to the user:

### Express
```typescript
import express from "express";
import { streamResponse } from "@layercode/node-server-sdk";

const app = express();
app.use(express.json());

app.post("/agent", async (req, res) => {
  return streamResponse(req.body, async ({ stream }) => {
    stream.tts("Hi, how can I help you today?");
    stream.end();
  });
});
```

### Next.js
```typescript
import { streamResponse } from "@layercode/node-server-sdk";

export const POST = async (request: Request) => {
  return streamResponse(request, async ({ stream }) => {
    stream.tts("Hi, how can I help you today?");
    stream.end();
  });
};
```

### Hono
```typescript
import { Hono } from "hono";
import { streamResponse } from "@layercode/node-server-sdk";

const app = new Hono();
app.post("/agent", 
  async (c) => {
    const requestBody = await c.req.json();
    return streamResponse(requestBody, async ({ stream }) => {
      stream.tts("Hi, how can I help you today?");
      stream.end();
    });
  }
);
```

## Backend Guides

Layercode supports any backend that can handle HTTP POST and SSE, including popular frameworks and languages.
Check out our step-by-step guides for different backend types:

### Backend Framework Guides

- **[Next.js (API Routes) Guide](/backend-guides/next-js)** - Build a full-stack web voice agent in Next.js, with its own agent backend
- **[Express (Node.js) Guide](/backend-guides/express)** - Implement the Layercode Webhook SSE API in your ExpressJS backend
- **[Hono (Cloudflare Workers) Guide](/backend-guides/hono)** - Implement the Layercode Webhook SSE API in your Hono backend
- **[Python (FastAPI) Guide](/backend-guides/fastapi)** - Implement the Layercode Webhook SSE API in your FastAPI backend

> Looking for another stack? Any backend that can handle HTTP POST and respond with SSE will work with Layercode. See the [Webhook SSE API documentation](/api-reference/webhook_sse_api) for details.

## Integrating with Your Frontend

Once you've integrated Your Backend, you can build web and mobile voice AI applications by integrating with one of our Frontend SDKs. Learn how to [Build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent).

## Integrating with Telephony

You can also build voice AI applications that can be used over the phone. Learn how to [Build a Phone Agent (coming soon)](/telephony-guides/build-a-phone-agent).

# ExpressJS
Source: https://docs.layercode.com/backend-guides/express

Implement the Layercode Webhook SSE API in your ExpressJS backend.

This guide shows you how to implement the Layercode [Webhook SSE API](/api-reference/webhook_sse_api) in an [ExpressJS](https://expressjs.com/) backend. You'll learn how to set up a webhook endpoint that receives transcribed messages from the Layercode voice pipeline and streams the agent's responses back to the frontend, to be turned into speech and spoken back to the user. You can test your backend using the Layercode dashboard playground or by following the [Build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent) guide.

**Example code:** [github](https://github.com/layercodedev) [layercodedev/example-backend-express](https://github.com/layercodedev/example-backend-express)

## Prerequisites

* Node.js 18+
* [Express](https://expressjs.com/)
* A Layercode account and pipeline ([sign up here](https://dash.layercode.com))
* (Optional) An API key for your LLM provider (we recommend Google Gemini)

## Setup

```bash
npm install express @layercode/node-server-sdk ai @ai-sdk/google node-fetch
```

Edit your .env environment variables. You'll need to add:

* `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key
* `LAYERCODE_WEBHOOK_SECRET` - Your Layercode pipeline's webhook secret, found in the [Layercode dashboard](https://dash.layercode.com) (go to your pipeline, click Edit in the Your Backend Box and copy the webhook secret shown)
* `LAYERCODE_API_KEY` - Your Layercode API key found in the [Layercode dashboard settings](https://dash.layercode.com/settings)

## Create Your Express Webhook Endpoint

Here's an example of a our Layercode webhook endpoint, which generates responses using Google Gemini and streams them back to the frontend as SSE events. See the [GitHub repo](https://github.com/layercodedev/example-backend-express) for the full example.

  ```ts agent.ts
  import type { RequestHandler } from 'express';
  import { createGoogleGenerativeAI } from '@ai-sdk/google';
  import { streamText } from 'ai';
  import type { CoreMessage } from 'ai';
  import { verifySignature, streamResponse } from '@layercode/node-server-sdk';
  import { Readable } from 'node:stream'; // Node.js 18+ only

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const sessionMessages: Record = {};

  const SYSTEM_PROMPT =
    "You are a helpful conversation assistant. You should respond to the user's message in a conversational manner. Your output will be spoken by a TTS model. You should respond in a way that is easy for the TTS model to speak and sound natural.";
  const WELCOME_MESSAGE = 'Welcome to Layercode. How can I help you today?';

  export const onRequestPost: RequestHandler = async (req, res) => {
    const requestBody = req.body;
    const signature = req.header('layercode-signature') || '';
    const secret = process.env.LAYERCODE_WEBHOOK_SECRET || '';
    const payload = JSON.stringify(requestBody);
    const isValid = verifySignature({ payload, signature, secret });
    if (!isValid) {
      console.error('Invalid signature', signature, secret, payload);
      res.status(401).send('Unauthorized');
      return;
    }
    console.log('Request body received from Layercode', requestBody);
    const { session_id, text, type } = requestBody;

    let messages = sessionMessages[session_id] || [];
    messages.push({ role: 'user', content: [{ type: 'text', text }] });

    let response;
    if (type === 'session.start') {
      response = streamResponse(requestBody, async ({ stream }: { stream: any }) => {
        stream.tts(WELCOME_MESSAGE);
        messages.push({
          role: 'assistant',
          content: [{ type: 'text', text: WELCOME_MESSAGE }],
        });
        stream.end();
      });
    } else {
      response = streamResponse(requestBody, async ({ stream }: { stream: any }) => {
        try {
          const { textStream } = streamText({
            model: google('gemini-2.0-flash-001'),
            system: SYSTEM_PROMPT,
            messages,
            onFinish: async ({ response }: { response: any }) => {
              messages.push(...response.messages);
              console.log('Current message history for session', session_id, JSON.stringify(messages, null, 2));
              sessionMessages[session_id] = messages;
            },
          });
          stream.data({
            textToBeShown: 'Hello, how can I help you today?',
          });
          await stream.ttsTextStream(textStream);
        } catch (err) {
          console.error('Handler error:', err);
        } finally {
          console.log('Stream ended');
          stream.end();
        }
      });
    }

    // Set headers and status
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.status(response.status);

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as any);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  };
  ```

  ```ts authorize.ts
  import type { RequestHandler } from 'express';

  export const onRequestPost: RequestHandler = async (req, res) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        res.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      res.json(data);
    } catch (error) {
      res.json({ error: error });
    }
  };
  ```

  ```ts index.ts
  import express from 'express';
  import { onRequestPost as onRequestAgent } from './agent';
  import { onRequestPost as onRequestAuthorize } from './authorize';
  import cors from 'cors';

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.post('/agent', onRequestAgent);
  app.post('/authorize', onRequestAuthorize);
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
  })
  ```

## 3. How It Works

* **/agent endpoint:** Receives POST requests from Layercode with the user's transcribed message, session, and turn info.
* **Session management:** Keeps track of conversation history per session (in-memory for demo; use a store for production).
* **LLM call:** Calls Google Gemini (or your own agent) with the conversation history and streams the response.
* **SSE streaming:** Streams the agent's response back to Layercode as Server-Sent Events, which are then converted to speech and played to the user.
* **/authorize endpoint:** Your Layercode API key should never be exposed to the frontend. Instead, your backend acts as a secure proxy: it receives the frontend's request then, calls the Layercode authorization API using your secret API key, and finally returns the `client_session_key` (and optionally a `session_id`) to the frontend. This key is required for the frontend to establish a secure WebSocket connection to Layercode.

## Running Your Backend

Start your Express server:

```bash
npx tsx index.ts
```

## Configure the Layercode Webhook endpoint

In the Layercode dashboard, go to your pipeline settings. Under **Your Backend**, click edit, and here you can set the URL of the webhook endpoint.

If running this example locally, setup a tunnel (we recommend cloudflared which is free for dev) to your localhost so the Layercode webhook can reach your backend. Follow our [tunnelling guide](/tunnelling).

## Test Your Voice Agent

There are two ways to test your voice agent:

1. Use the Layercode playground tab, found in the pipeline in the [Layercode dashboard](https://dash.layercode.com).
2. Follow one of our [Frontend Guides to build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent) that uses this backend.

# FastAPI
Source: https://docs.layercode.com/backend-guides/fastapi

Implement the Layercode Webhook SSE API in your FastAPI backend.

This guide shows you how to implement the Layercode [Webhook SSE API](/api-reference/webhook_sse_api) in a Python backend using [FastAPI](https://fastapi.tiangolo.com/). You'll learn how to set up a webhook endpoint that receives transcribed messages from the Layercode voice pipeline and streams the agent's responses back to the frontend, to be turned into speech and spoken back to the user. You can test your backend using the Layercode dashboard playground or by following the [Build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent) guide.

**Example code:** [github](https://github.com/layercodedev) [layercodedev/example-backend-fastapi](https://github.com/layercodedev/example-backend-fastapi)

## Prerequisites

* Python 3.8+
* [FastAPI](https://fastapi.tiangolo.com/) and [Uvicorn](https://www.uvicorn.org/) for serving your API
* A Layercode account and pipeline ([sign up here](https://dash.layercode.com))
* (Optional) An API key for your LLM provider (we recommend Google Gemini)

## Setup

pip:

```bash
pip install fastapi uvicorn pydantic httpx google-generativeai dotenv
```

uv:

```bash
uv init && uv add fastapi uvicorn pydantic httpx google-generativeai dotenv
```

Edit your .env environment variables. You'll need to add:

* `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key
* `LAYERCODE_WEBHOOK_SECRET` - Your Layercode pipeline's webhook secret, found in the [Layercode dashboard](https://dash.layercode.com) (go to your pipeline, click Edit in the Your Backend Box and copy the webhook secret shown)
* `LAYERCODE_API_KEY` - Your Layercode API key found in the [Layercode dashboard settings](https://dash.layercode.com/settings)

## Create Your FastAPI Webhook Endpoint

Here's an example of a our Layercode webhook endpoint, which generates responses using Google Gemini and streams them back to the frontend as SSE events. See the [GitHub repo](https://github.com/layercodedev/example-backend-fastapi) for the full example.

```python main.py
import os
import json
import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException, Depends, JSONResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, AsyncGenerator
import asyncio
import google.generativeai as genai
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
import httpx

load_dotenv()

app = FastAPI()

# Webhook signature verification
def verify_signature(request_body: bytes, signature_header: str, secret: str, timestamp_tolerance: int = 300) -> bool:
    # signature_header is expected in the format: t=timestamp,v1=signature
    try:
        parts = dict(item.split('=') for item in signature_header.split(','))
        timestamp = int(parts['t'])
        signature = parts['v1']
    except Exception:
        return False

    # Check timestamp tolerance
    now = int(time.time())
    if abs(now - timestamp) > timestamp_tolerance:
        return False

    # Reconstruct signed payload
    signed_payload = f"{timestamp}.{request_body.decode()}"
    expected_signature = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)

async def verify_webhook(request: Request):
    signature_header = request.headers.get("layercode-signature")
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing signature header")

    body = await request.body()
    if not verify_signature(body, signature_header, os.getenv("LAYERCODE_WEBHOOK_SECRET", "")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    return body

class MessageContent(BaseModel):
    type: str
    text: str

class Message(BaseModel):
    role: str
    content: List[MessageContent]

session_messages: Dict[str, List[Message]] = {}

SYSTEM_PROMPT = (
    "You are a helpful conversation assistant. You should respond to the user's message in a conversational manner. "
    "Your output will be spoken by a TTS model. You should respond in a way that is easy for the TTS model to speak and sound natural."
)
WELCOME_MESSAGE = "Welcome to Layercode. How can I help you today?"

class RequestBody(BaseModel):
    text: str
    type: str
    session_id: str
    turn_id: str

GOOGLE_API_KEY = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
gemini_executor = ThreadPoolExecutor(max_workers=2)

def to_gemini_messages(messages: List[Message]):
    # Flatten to Gemini's expected format
    return [
        {"role": m.role, "parts": [c.text for c in m.content if c.type == "text"]}
        for m in messages
    ]

def gemini_stream_response(messages: List[Message], system_prompt: str):
    model = genai.GenerativeModel("gemini-2.0-flash-001")
    # Copy messages to avoid mutating the original
    messages_for_gemini = messages.copy()
    if messages_for_gemini and messages_for_gemini[0].role == "user":
        # Prepend system prompt to the first user message
        messages_for_gemini[0].content[0].text = f"{system_prompt}\n\n{messages_for_gemini[0].content[0].text}"

    chat = model.start_chat(history=to_gemini_messages(messages_for_gemini))
    return chat.send_message(messages[-1].content[0].text, stream=True)

async def stream_google_gemini(messages: List[Message], system_prompt: str) -> AsyncGenerator[str, None]:
    loop = asyncio.get_event_loop()
    stream = await loop.run_in_executor(
        gemini_executor, gemini_stream_response, messages, system_prompt
    )
    for chunk in stream:
        if hasattr(chunk, "text"):
            yield chunk.text
        elif isinstance(chunk, dict) and "text" in chunk:
            yield chunk["text"]

@app.post("/agent")
async def agent_endpoint(body: RequestBody, verified_body: bytes = Depends(verify_webhook)):
    messages = session_messages.setdefault(body.session_id, [])
    # Add user message
    messages.append(Message(role="user", content=[MessageContent(type="text", text=body.text)]))

    if body.type == "session.start":
        async def welcome_stream():
            data = json.dumps(
                {
                    "type": "response.tts",
                    "content": WELCOME_MESSAGE,
                    "turn_id": body.turn_id,
                }
            )
            yield f"data: {data}\n\n"
            messages.append(Message(role="assistant", content=[MessageContent(type="text", text=WELCOME_MESSAGE)]))
            session_messages[body.session_id] = messages
            end_data = json.dumps({"type": "response.end", "turn_id": body.turn_id})
            yield f"data: {end_data}\n\n"
        return StreamingResponse(welcome_stream(), media_type="text/event-stream")

    text_stream = stream_google_gemini(messages, SYSTEM_PROMPT)

    async def streaming_and_save():
        # Optionally send a data message (like in Next.js)
        data = json.dumps({"textToBeShown": "Hello, how can I help you today?"})
        yield f"data: {data}\n\n"

        full_response = ""
        async for chunk in text_stream:
            full_response += chunk
            data = json.dumps(
                {"type": "response.tts", "content": chunk, "turn_id": body.turn_id}
            )
            yield f"data: {data}\n\n"
        end_data = json.dumps({"type": "response.end", "turn_id": body.turn_id})
        yield f"data: {end_data}\n\n"
        # Save assistant's response to session
        messages.append(Message(role="assistant", content=[MessageContent(type="text", text=full_response)]))
        session_messages[body.session_id] = messages

    return StreamingResponse(streaming_and_save(), media_type="text/event-stream")

@app.post("/authorize")
async def authorize_endpoint(request: Request):
    api_key = os.getenv("LAYERCODE_API_KEY")
    if not api_key:
        return JSONResponse({"error": "LAYERCODE_API_KEY is not set."}, status_code=500)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body."}, status_code=400)
    if not body or not body.get("pipeline_id"):
        return JSONResponse({"error": "Missing pipeline_id in request body."}, status_code=400)
    endpoint = "https://api.layercode.com/v1/pipelines/authorize_session"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                endpoint,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=body,
            )
        if response.status_code != 200:
            return JSONResponse({"error": response.text}, status_code=500)
        return JSONResponse(response.json())
    except Exception as error:
        print("Layercode authorize session response error:", str(error))
        return JSONResponse({"error": str(error)}, status_code=500)

```

## How It Works

* **/agent endpoint:** Receives POST requests from Layercode with the user's transcribed message, session, and turn info. The [webhook request is verified](/backend-guides/connect-backend#webhook-verification) as coming from Layercode.
* **LLM call:** Calls Google Gemini Flash 2.0 with the system prompt, message history and user's new transcribed message.
* **SSE streaming:** As soon as the LLM starts generating a response, the backend streams the output back as SSE messages to Layercode, which converts it to speech and delivers it to the frontend for playback in realtime.
* **/authorize endpoint:** Your Layercode API key should never be exposed to the frontend. Instead, your backend acts as a secure proxy: it receives the frontend's request then, calls the Layercode authorization API using your secret API key, and finally returns the `client_session_key` (and optionally a `session_id`) to the frontend. This key is required for the frontend to establish a secure WebSocket connection to Layercode.

See the [GitHub repo](https://github.com/layercodedev/example-backend-fastapi) for the full example.

## Running Your Backend

Start your FastAPI server with Uvicorn:

```bash
uvicorn main:app --reload
```

## Configure the Layercode Webhook endpoint

In the Layercode dashboard, go to your pipeline settings. Under **Your Backend**, click edit, and here you can set the URL of the webhook endpoint.

If running this example locally, setup a tunnel (we recommend cloudflared which is free for dev) to your localhost so the Layercode webhook can reach your backend. Follow our [tunnelling guide](/tunnelling).

## Test Your Voice Agent

There are two ways to test your voice agent:

1. Use the Layercode playground tab, found in the pipeline in the [Layercode dashboard](https://dash.layercode.com).
2. Follow one of our [Frontend Guides to build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent) that uses this backend.

# Hono
Source: https://docs.layercode.com/backend-guides/hono

Implement the Layercode Webhook SSE API in your Hono backend.

This guide shows you how to implement the Layercode [Webhook SSE API](/api-reference/webhook_sse_api) in a [Hono](https://hono.dev/) backend (Cloudflare Workers compatible).
You'll learn how to set up a webhook endpoint that receives transcribed messages from the Layercode voice pipeline and streams the agent's responses back to the frontend, to be turned into speech and spoken back to the user.
You can test your backend using the Layercode dashboard playground or by following the [Build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent) guide.

**Example code:** [github](https://github.com/layercodedev) [layercodedev/example-backend-hono](https://github.com/layercodedev/example-backend-hono)

## Prerequisites

* Node.js 18+
* [Hono](https://hono.dev/) (Cloudflare Workers compatible)
* A Layercode account and pipeline ([sign up here](https://dash.layercode.com))
* (Optional) An API key for your LLM provider (e.g., Google Gemini)

## Setup

```bash
npm create hono@latest my-app
cd my-app
npm install hono @layercode/node-server-sdk
```

Edit your .dev.vars (automatically read by wrangler) environment variables. You'll need to add:

* `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key
* `LAYERCODE_WEBHOOK_SECRET` - Your Layercode pipeline's webhook secret, found in the [Layercode dashboard](https://dash.layercode.com) (go to your pipeline, click Edit in the Your Backend Box and copy the webhook secret shown)

## Create Your Hono Handler

Here's a simplified example of the core functionality needed to implement the Layercode webhook endpoint:

  ```ts src/agent.ts
  import { Context } from "hono";
  import { verifySignature, streamResponse } from '@layercode/node-server-sdk';
  import { env } from 'cloudflare:workers';

  const sessionMessages = {};

  const WELCOME_MESSAGE = "Welcome to Layercode. How can I help you today?";

  export const onRequestPost = async (c: Context) => {
    const secret = env.LAYERCODE_WEBHOOK_SECRET;
    if (!secret) {
      return c.json({ error: 'LAYERCODE_WEBHOOK_SECRET is not set' }, 500);
    }

    const rawBody = await c.req.text();
    const signature = c.req.header('layercode-signature') || '';
    const isValid = verifySignature({ payload: rawBody, signature, secret });
    if (!isValid) {
      console.error('Invalid signature', signature, secret, rawBody);
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const json = await c.req.json();
    const { text, type, session_id } = json;

    let messages = sessionMessages[session_id] || [];
    messages.push({ role: "user", content: [{ type: "text", text }] });

    // Handle session start
    if (type === "session.start") {
      return streamResponse(json, async ({ stream }) => {
        stream.tts(WELCOME_MESSAGE);
        messages.push({
          role: "assistant",
          content: [{ type: "text", text: WELCOME_MESSAGE }],
        });
        stream.end();
      });
    }

    // Handle regular messages
    return streamResponse(json, async ({ stream }) => {
      try {
        // Your agent logic here
        const response = "This is a sample response from your agent";
        stream.tts(response);

        // Save the response to session history
        messages.push({
          role: "assistant",
          content: [{ type: "text", text: response }],
        });
        sessionMessages[session_id] = messages;
      } catch (err) {
        console.error("Error:", err);
      } finally {
        stream.end();
      }
    });
  };
  ```

  ```ts src/authorize.ts
  import { Context } from 'hono';
  import { env } from 'cloudflare:workers';

  export const onRequestPost = async (c: Context) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        return c.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      return c.json(data);
    } catch (error) {
      return c.json({ error: error });
    }
  };
  ```

  ```ts src/index.ts
  import { Hono } from 'hono';
  import { onRequestPost as onRequestPostAgent } from './agent';
  import { onRequestPost as onRequestPostAuthorize } from './authorize';
  import { cors } from 'hono/cors'

  const app = new Hono();

  app.post('/agent', onRequestPostAgent);

  app.use('/authorize', cors())
  app.post('/authorize', onRequestPostAuthorize);

  export default app;
  ```

## 3. How It Works

* **/agent endpoint:** Receives POST requests from Layercode with the user's transcribed message, session, and turn info. The [webhook request is verified](/backend-guides/connect-backend#webhook-verification) as coming from Layercode.
* **Session management:** Keeps track of conversation history per session (in-memory for demo; use a store for production).
* **LLM call:** Calls Google Gemini Flash 2.0 with the system prompt, message history and user's new transcribed message.
* **SSE streaming:** As soon as the LLM starts generating a response, the backend streams the output back as SSE messages to Layercode, which converts it to speech and delivers it to the frontend for playback in realtime.
* **/authorize endpoint:** Your Layercode API key should never be exposed to the frontend. Instead, your backend acts as a secure proxy: it receives the frontend's request then, calls the Layercode authorization API using your secret API key, and finally returns the `client_session_key` (and optionally a `session_id`) to the frontend. This key is required for the frontend to establish a secure WebSocket connection to Layercode.

## 4. Running Your Backend

Start your Hono app (Cloudflare Workers):

```bash
npx wrangler dev
```

## Configure the Layercode Webhook endpoint

In the Layercode dashboard, go to your pipeline settings. Under **Your Backend**, click edit, and here you can set the URL of the webhook endpoint.

If running this example locally, setup a tunnel (we recommend cloudflared which is free for dev) to your localhost so the Layercode webhook can reach your backend. Follow our [tunnelling guide](/tunnelling).

## Test Your Voice Agent

There are two ways to test your voice agent:

1. Use the Layercode playground tab, found in the pipeline in the [Layercode dashboard](https://dash.layercode.com).
2. Follow one of our [Frontend Guides to build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent) that uses this backend.

# Using the Hosted Backend
Source: https://docs.layercode.com/backend-guides/hosted-backend

Using the Layercode Hosted Backend to power your voice agent.

Layercode offers a hosted backend option that makes it easy to build and deploy voice agents without writing the agent backend yourself. In this mode, Layercode handles the backend logic for you: when a user speaks, Layercode sends their query to an LLM (Large Language Model) using a customizable prompt, then streams the AI-generated response back to the user as speech.

### Features

* Responses are generated using the best low-latency LLM available (currently Gemini Flash 2.0)
* Conversation history is stored in Layercode's cloud
* You can customize the prompt to change the behavior of the voice agent
* Integrate with your web or mobile frontend, or connect to inbound or outbound phone calls
* Still have complete control over the transcription, turn taking and text-to-speech voice pipeline settings

This approach is ideal for quickly getting started with Layercode and is sufficient for simple voice AI applications.

If you need more advanced functionality or want complete control over how responses are generated, read more about how to [Connect Your Backend](/backend-guides/connect-backend).

> **Note**: We're actively working to expand the hosted backend's capabilities. Stay tuned for upcoming features, including MCP tools.

## Integrating with Your Frontend

The Hosted Backend can be used to build web and mobile voice AI applications by integrating with one of our Frontend SDKs. Learn how to [Build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent). Note that even when using the Hosted Backend, you'll still need to implement an [Authorize Client Session](/frontend-guides/next-js#authorize-client-session) endpoint to authenticate user sessions.

## Integrating with Telephony

The Hosted Backend can be used to build voice AI applications that can be used over the phone. Learn how to [Build a Phone Agent (coming soon)](/telephony-guides/build-a-phone-agent).

# Next.js
Source: https://docs.layercode.com/backend-guides/next-js

Implement the Layercode Webhook SSE API in your Next.js API Routes backend.

This guide shows you how to implement the Layercode [Webhook SSE API](/api-reference/webhook_sse_api) in a Next.js backend using the [Node.js Backend SDK](/sdk-reference/node_js_sdk). You'll learn how to set up a webhook endpoint that receives transcribed messages from the Layercode voice pipeline and streams the agent's responses back to the frontend, to be turned into speech and spoken back to the user.

**Example code:** [github](https://github.com/layercodedev) [layercodedev/example-fullstack-nextjs](https://github.com/layercodedev/example-fullstack-nextjs)

> **Note**: This backend example is part of a full-stack example that also includes a web voice agent React frontend. We recommend also reading the [Next.js frontend guide](/frontend-guides/next-js) to get the most out of this example.

## Prerequisites

* Node.js 18+
* [Next.js](https://nextjs.org/) (App Router recommended)
* A Layercode account and pipeline ([sign up here](https://dash.layercode.com))
* (Optional) An API key for your LLM provider (we recommend Google Gemini)

## Setup

Install dependencies:

```bash
npm install @layercode/node-server-sdk @ai-sdk/google
```

Edit your .env environment variables. You'll need to add:

* `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key
* `LAYERCODE_API_KEY` - Your Layercode API key found in the [Layercode dashboard settings](https://dash.layercode.com/settings)
* `LAYERCODE_WEBHOOK_SECRET` - Your Layercode pipeline's webhook secret, found in the [Layercode dashboard](https://dash.layercode.com) (go to your pipeline, click Edit in the Your Backend Box and copy the webhook secret shown)
* `NEXT_PUBLIC_LAYERCODE_PIPELINE_ID` - The Layercode pipeline ID for your voice agent. Find this ID in [Layercode dashboard](https://dash.layercode.com/)

## Create Your Next.js API Route

Here's a simplified example of the core functionality needed to implement the Layercode webhook endpoint. See the [GitHub repo](https://github.com/layercodedev/example-fullstack-nextjs) for the full example.

```ts app/api/agent/route.ts
export const maxDuration = 300; // We set a generous Vercel max function duration to allow for long running agents
export const dynamic = 'force-dynamic';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage } from 'ai';
import { streamResponse, verifySignature } from '@layercode/node-server-sdk';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const SYSTEM_PROMPT =
  "You are a helpful conversation assistant. You should respond to the user's message in a conversational manner. Your output will be spoken by a TTS model. You should respond in a way that is easy for the TTS model to speak and sound natural.";

// POST request handler for Layercode incoming webhook, per turn of the conversation
export const POST = async (request: Request) => {
  const requestBody = await request.json();
  const signature = request.headers.get('layercode-signature') || '';
  const secret = process.env.LAYERCODE_WEBHOOK_SECRET || '';
  const payload = JSON.stringify(requestBody);
  const isValid = verifySignature({ payload, signature, secret });

  if (!isValid) {
    console.error('Invalid signature', signature, secret, payload);
    return new Response('Unauthorized', { status: 401 });
  }

  return streamResponse(requestBody, async ({ stream }) => {
    const { textStream } = streamText({
      model: google('gemini-2.0-flash-001'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text }] }],
      onFinish: async ({ response }) => {
        stream.end(); // We must call stream.end() here to tell Layercode that the assistant's response has finished
      },
    });
    // Here we return the textStream chunks as SSE messages to Layercode, to be spoken to the user
    await stream.ttsTextStream(textStream);
  });
};
```

## How It Works

* **/api/agent webhook endpoint:** Receives POST requests from Layercode with the user's transcribed message, session, and turn info. The [webhook request is verified](/backend-guides/connect-backend#webhook-verification) as coming from Layercode.
* **LLM call:** Calls Google Gemini Flash 2.0 with the system prompt and user's new transcribed message.
* **SSE streaming:** As soon as the LLM starts generating a response, the backend streams the output back as SSE messages to Layercode, which converts it to speech and delivers it to the frontend for playback in realtime.

See the [GitHub repo](https://github.com/layercodedev/example-fullstack-nextjs) for the full example which includes conversation history, welcome message and more.

## Running Your Backend

Start your Next.js app:

```bash
npm run dev
```

## Configure the Layercode Webhook endpoint

In the Layercode dashboard, go to your pipeline settings. Under **Your Backend**, click edit, and here you can set the URL of the webhook endpoint.

If running this example locally, setup a tunnel (we recommend cloudflared which is free for dev) to your localhost so the Layercode webhook can reach your backend. Follow our [tunneling guide](/tunnelling).

## Test Your Voice Agent

There are two ways to test your voice agent:

1. Use the Layercode playground tab, found in the pipeline in the [Layercode dashboard](https://dash.layercode.com).
2. As this example is a full-stack example, you can visit [http://localhost:3000](http://localhost:3000) in your browser and speak to the voice agent in your browser using the React frontend included.

# Build a Web Voice Agent
Source: https://docs.layercode.com/frontend-guides/build-a-web-voice-agent

Build a web voice agent with Layercode.

Layercode makes it simple to build web and mobile voice AI applications. Our [React SDK](/sdk-reference/react_sdk) (and [vanilla JavaScript SDK](/sdk-reference/vanilla_js_sdk)) handles all the complexity required for real-time, low-latency, two-way voice agent interactions. Just add the React SDK to your React project, and use the `useLayercodePipeline` hook, which will:

* Establish a WebSocket connection to Layercode
* Capture microphone audio from the user and stream it for transcription
* Handle audio playback and agent responses

You can pair your frontend with any of our [backend examples](/backend-guides/connect-backend#backend-guides), or use the Layercode [Hosted Backend](/backend-guides/hosted-backend). The frontend guides include example components for the microphone, audio visualization, and connection status indicator.

  

  
  
  

  
    
    
    
    
  
  
    
    
  
  
    
  

}
    href="/frontend-guides/next-js"
  >
    Build a full-stack web voice agent in Next.js, with its own agent backend
  

  {/* - **[React](/frontend-guides/react)**
      Build a web voice agent frontend in React, with Layercode's Hosted Backend.
     */}

# Next.js
Source: https://docs.layercode.com/frontend-guides/next-js

Build web voice agent experiences in Next.js with the Layercode React SDK.

Layercode makes it easy to build web-based voice agent applications in Next.js. In this guide we'll walk you through a full-stack Next.js example voice agent, that lets users speak to a voice AI in their browser.

**Example code:** [github](https://github.com/layercodedev) [layercodedev/example-fullstack-nextjs](https://github.com/layercodedev/example-fullstack-nextjs)

> **Note**: This frontend example is part of a full-stack example that also includes a web voice agent React frontend. We recommend reading the [Next.js backend
  guide](/backend-guides/next-js) to get the most out of this example.

## Setup

To get started, you'll need a Layercode account and a voice pipeline you've created. If you haven't done so yet, follow our [Getting Started Guide](/getting-started).

Then follow the setup instructions in the repo [README file](https://github.com/layercodedev/example-fullstack-nextjs?tab=readme-ov-file#getting-started).

> **Warning**: **Disable React Strict Mode for Development**: React Strict Mode renders components twice in development, which causes the Layercode voice agent hook to initialize twice. This results in duplicate voice agent sessions and can cause issues like hearing the voice agent speak twice.

  To disable React Strict Mode, remove or set `reactStrictMode: false` in your `next.config.js`:

  ```javascript next.config.js
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: false, // Disable for Layercode development
  }

  module.exports = nextConfig
  ```

## How it works

### Connect to a Layercode voice pipeline

We use the [React SDK](/sdk-reference/react_sdk) useLayercodePipeline hook which handles all the complexity required for real-time, low-latency, two-way voice agent interactions.

Here's a simplified example of how to use the React SDK in a Next.js application:

  ```tsx app/ui/VoiceAgent.tsx
  import { useLayercodePipeline } from '@layercode/react-sdk';
  import { MicrophoneIcon } from '../icons/MicrophoneIcon';

  export default function VoiceAgent() {
    const { agentAudioAmplitude, status } = useLayercodePipeline({
      pipelineId: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID,
      authorizeSessionEndpoint: '/api/authorize',
    });

  return (

  
    
  
  ); }

  ```

  ```tsx app/page.tsx
  'use client';
  import VoiceAgent from './ui/VoiceAgent';

  export default function Home() {
    return (
      
        
      
    );
  }
  ```

**The useLayercodePipeline hook accepts the following parameters:**

* Your pipeline ID, found in the [Layercode Dashboard](https://dash.layercode.com)
* The endpoint to authorize the client session (see [Authorize Client Session](#authorizing-sessions))
* An optional callback function for handling data messages (not shown in example above)

**On mount, the useLayercodePipeline hook will:**

1. Make a request to your authorize session endpoint to create new session and return the client session key. Here you can also do any user authorization checks you need for your app.
2. Establish a WebSocket connection to Layercode (using the client session key)
3. Capture microphone audio from the user and stream it to the Layercode voice pipeline for transcription
4. (At this stage, Layercode will call the [Hosted Backend](/backend-guides/hosted-backend) or [Your Backend](/backend-guides/connect-backend) webhook to generate a response, and then convert the response from text to speech)
5. Playback audio of the voice agent's response to the user in their browser, as it's generated

**The useLayercodePipeline hook returns an object with the following properties:**

* `status`: The connection status of the voice agent. You can show this to the user to indicate the connection status.
* `agentAudioAmplitude`: The amplitude of the audio from the voice agent. You can use this to drive an animation when the voice agent is speaking.

By default, your voice pipeline will handle turn taking in automatic mode. But you can configure your voice pipeline to use push to talk mode. If you are using push to talk mode see the [push-to-talk instructions in the repo README](https://github.com/layercodedev/example-fullstack-nextjs?tab=readme-ov-file#push-to-talk-mode) and read about [how the VoiceAgentPushToTalk component](#voiceagentpushtotalk-optional) works below.

### Authorizing Sessions

To connect a client (browser) to your Layercode voice pipeline, you must first authorize the session. The SDK will automatically send a POST request to the path (or url if your backend is on a different domain) passed in the `authorizeSessionEndpoint` option. In this endpoint, you will need to call the Layercode REST API to generate a `client_session_key` and `session_id` (if it's a new session).

> **Info**: If your backend is on a different domain, set `authorizeSessionEndpoint` to the full URL (e.g., `https://your-backend.com/api/authorize`).

**Why is this required?**
Your Layercode API key should never be exposed to the frontend. Instead, your backend acts as a secure proxy: it receives the frontend's request, then calls the Layercode authorization API using your secret API key, and finally returns the `client_session_key` to the frontend.

This also allows you to authenticate your user, and set any additional metadata that you want passed to your backend webhook.

**How it works:**

1. **Frontend:**
   The SDK automatically sends a POST request to your `authorizeSessionEndpoint` with a request body.

2. **Your Backend:**
   Your backend receives this request, then makes a POST request to the Layercode REST API `/v1/pipelines/authorize_session` endpoint, including your `LAYERCODE_API_KEY` as a Bearer token in the headers.

3. **Layercode:**
   Layercode responds with a `client_session_key` (and a `session_id`), which your backend returns to the frontend.

4. **Frontend:**
   The SDK uses the `client_session_key` to establish a secure WebSocket connection to Layercode.

**Example backend authorization endpoint code:**

  ```ts Next.js app/api/authorize/route.ts
  export const dynamic = "force-dynamic";
  import { NextResponse } from "next/server";

  export const POST = async (request: Request) => {
    // Here you could do any user authorization checks you need for your app
    const endpoint = "https://api.layercode.com/v1/pipelines/authorize_session";
    const apiKey = process.env.LAYERCODE_API_KEY;
    if (!apiKey) {
      throw new Error("LAYERCODE_API_KEY is not set.");
    }
    const requestBody = await request.json();
    if (!requestBody || !requestBody.pipeline_id) {
      throw new Error("Missing pipeline_id in request body.");
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      return NextResponse.json(await response.json());
    } catch (error: any) {
      console.log("Layercode authorize session response error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  };
  ```

  ```ts Hono
  import { Context } from 'hono';
  import { env } from 'cloudflare:workers';

  export const onRequestPost = async (c: Context) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        return c.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      return c.json(data);
    } catch (error) {
      return c.json({ error: error });
    }
  };
  ```

  ```ts ExpressJS
  import type { RequestHandler } from 'express';

  export const onRequestPost: RequestHandler = async (req, res) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        res.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      res.json(data);
    } catch (error) {
      res.json({ error: error });
    }
  };
  ```

  ```python Python
  import os
  import httpx
  from fastapi.responses import JSONResponse

  @app.post("/authorize")
  async def authorize_endpoint(request: Request):
      api_key = os.getenv("LAYERCODE_API_KEY")
      if not api_key:
          return JSONResponse({"error": "LAYERCODE_API_KEY is not set."}, status_code=500)
      try:
          body = await request.json()
      except Exception:
          return JSONResponse({"error": "Invalid JSON body."}, status_code=400)
      if not body or not body.get("pipeline_id"):
          return JSONResponse({"error": "Missing pipeline_id in request body."}, status_code=400)
      endpoint = "https://api.layercode.com/v1/pipelines/authorize_session"
      try:
          async with httpx.AsyncClient() as client:
              response = await client.post(
                  endpoint,
                  headers={
                      "Content-Type": "application/json",
                      "Authorization": f"Bearer {api_key}",
                  },
                  json=body,
              )
          if response.status_code != 200:
              return JSONResponse({"error": response.text}, status_code=500)
          return JSONResponse(response.json())
      except Exception as error:
          print("Layercode authorize session response error:", str(error))
          return JSONResponse({"error": str(error)}, status_code=500)
  ```

## Components

### AudioVisualization

The `AudioVisualization` component is used to visualize the audio from the voice agent. It uses the `agentAudioAmplitude` value returned from the useLayercodePipeline hook to drive the height of the audio bars with a simple animation.

```tsx app/ui/AudioVisualization.tsx
export function AudioVisualization({ amplitude, height = 46 }: { amplitude: number; height?: number }) {
  // Calculate the height of each bar based on amplitude
  const maxHeight = height;
  const minHeight = Math.floor(height / 6);
  const barWidth = Math.floor(minHeight);

  // Create multipliers for each bar to make middle bars taller
  const multipliers = [0.2, 0.5, 1.0, 0.5, 0.2];

  // Boost amplitude by 7 and ensure it's between 0 and 1
  const normalizedAmplitude = Math.min(Math.max(amplitude * 7, 0), 1);

  return (
    
      {multipliers.map((multiplier, index) => {
        const barHeight = minHeight + normalizedAmplitude * maxHeight * multiplier;

        return (
          
            {/* Top rounded cap */}
            
            {/* Middle straight section */}
            
            {/* Bottom rounded cap */}
            
          
        );
      })}
    
  );
}
```

### ConnectionStatusIndicator

The `ConnectionStatusIndicator` component is used to display the connection status of the voice agent. It uses the `status` value returned from the useLayercodePipeline hook to display the connection status.

```tsx app/ui/ConnectionStatusIndicator.tsx
export function ConnectionStatusIndicator({ status }: { status: string }) {
  return (
    
      
      
        {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : status === "error" ? "Connection Error" : "Disconnected"}
      
    
  );
}
```

### VoiceAgentPushToTalk (optional)

Because the useLayercodePipeline hook handles all of the audio streaming and playback, in most cases the microphone button is simply a visual aid and doesn't implement any logic. A simple microphone icon inside a circle will suffice in most cases.

Layercode does support 'push-to-talk' turn taking, as an alternative to automatic turn taking (read more about [turn taking](/voice-guides/turn-taking)). When using 'push-to-talk' turn taking, holding down and releasing the `MicrophoneButton` must send a WebSocket message to tell Layercode the user has started and finished talking. In this example, we provide an alternative `VoiceAgentPushToTalk` component, that along with the `MicrophoneButtonPushToTalk` component, handles this logic.

To use this mode, you'll need to edit `app/page.tsx` to use the `VoiceAgentPushToTalk` component instead of the `VoiceAgent` component. Then in your Layercode Dashboard, you'll need to click Edit in the Transcription section of your voice pipeline and set the Turn Taking to Push to Talk.

  ```tsx app/ui/VoiceAgentPushToTalk.tsx
  import { useLayercodePipeline } from '@layercode/react-sdk';
  import { AudioVisualization } from './AudioVisualization';
  import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
  import { MicrophoneButtonPushToTalk } from './MicrophoneButtonPushToTalk';

  export default function VoiceAgentPushToTalk() {
    const { agentAudioAmplitude, status, triggerUserTurnStarted, triggerUserTurnFinished } = useLayercodePipeline({
      pipelineId: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID!,
      authorizeSessionEndpoint: '/api/authorize',
      onDataMessage: (data) => {
        console.log('Received data msg', data);
      },
    });

  return (

  
    Voice Agent Demo
    
    
      
      
    
  
  ); }

  ```

  ```tsx app/ui/MicrophoneButtonPushToTalk.tsx
  import { useButtonHold } from '../hooks/useButtonHold';
  import { MicrophoneIcon } from '../icons/MicrophoneIcon';
  export function MicrophoneButtonPushToTalk({ triggerUserTurnStarted, triggerUserTurnFinished }: { triggerUserTurnStarted: () => void; triggerUserTurnFinished: () => void }) {
    // When using push-to-talk turn taking in your Layercode voice pipeline, you'll need to call triggerUserTurnStarted and triggerUserTurnFinished when the user holds down the microphone button or spacebar.
    // The useButtonHold hook handles this state, and also include debouncing so that short accidental clicks are ignored.
    const { isVisuallyPressed, handlePressStart, handlePressEnd } = useButtonHold({
      onPressStart: triggerUserTurnStarted,
      onPressEnd: triggerUserTurnFinished,
      key: 'Space',
    });

    return (
      
        Hold while speaking
        
      
    );
  }
  ```

# React
Source: https://docs.layercode.com/frontend-guides/react

Build web voice agent experiences in React with the Layercode React SDK.

Layercode makes it easy to build web-based voice agent applications in React. This guide walks you through a full-stack React example voice agent, letting users speak to a voice AI in their browser.

**Example code:** [github](https://github.com/layercodedev) [layercodedev/example-frontend-react](https://github.com/layercodedev/example-frontend-react)

> **Note**: This frontend example is designed for use with a Layercode [Hosted Backend](/backend-guides/hosted-backend).

## Setup

To get started, you'll need a Layercode account and a voice pipeline. If you haven't done so yet, follow our [Getting Started Guide](/getting-started).

Clone the example repo and install dependencies:

```bash
git clone https://github.com/layercodedev/example-frontend-react.git
cd example-frontend-react
npm install
```

> **Warning**: **Disable React Strict Mode for Development**: React Strict Mode renders components twice in development, which causes the Layercode voice agent hook to initialize twice. This results in duplicate voice agent sessions and can cause issues like hearing the voice agent speak twice.

  If you're using Create React App, remove `` from your `src/index.js` or `src/index.tsx`:

  ```tsx src/index.tsx
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import './index.css';
  import App from './App';

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    // Remove React.StrictMode wrapper for Layercode development
    
  );
  ```

  If you're using Vite, ensure `React.StrictMode` is not wrapping your app in `src/main.tsx`.

### Project structure

This project uses [Vite](https://vitejs.dev/) for fast React development, [Tailwind CSS](https://tailwindcss.com/) for styling, and TypeScript.

## How it works

### Connect to a Layercode voice pipeline

We use the [React SDK](/sdk-reference/react_sdk) `useLayercodePipeline` hook, which handles all the complexity required for real-time, low-latency, two-way voice agent interactions.

Here's a simplified example of how to use the React SDK in a React application:

  ```tsx src/ui/VoiceAgent.tsx
  import { useLayercodePipeline } from "@layercode/react-sdk";
  import { AudioVisualization } from "./AudioVisualization";
  import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
  import { MicrophoneIcon } from "../icons/MicrophoneIcon";

  export default function VoiceAgent() {
    const { agentAudioAmplitude, status } = useLayercodePipeline({
      pipelineId: "your-pipeline-id",
      authorizeSessionEndpoint: "/api/authorize",
      onDataMessage: (data) => {
        console.log("Received data msg", data);
      },
    });

    return (
      
        Voice Agent Demo
        
        
          
            
          
          
        
      
    );
  }
  ```

  ```tsx src/App.tsx
  import "./App.css";
  import VoiceAgent from "./ui/VoiceAgent";

  function App() {
    return (
      
        
      
    );
  }

  export default App;

  ```

**The `useLayercodePipeline` hook accepts:**

* Your pipeline ID (from the [Layercode Dashboard](https://dash.layercode.com))
* The endpoint to authorize the client session (see [Authorize Client Session](/frontend-guides/next-js#authorizing-sessions))
* An optional callback function for handling data messages

**On mount, the `useLayercodePipeline` hook will:**

1. Make a request to your authorize session endpoint to create new session and return the client session key.
2. Establish a WebSocket connection to Layercode (using the client session key)
3. Capture microphone audio from the user and stream it to the Layercode voice pipeline for transcription
4. (At this stage, Layercode will call the [Hosted Backend](/backend-guides/hosted-backend) or [Your Backend](/backend-guides/connect-backend) webhook to generate a response, and then convert the response from text to speech)
5. Playback audio of the voice agent's response to the user in their browser, as it's generated

**The `useLayercodePipeline` hook returns an object with the following properties:**

* `status`: The connection status of the voice agent. You can show this to the user to indicate the connection status.
* `agentAudioAmplitude`: The amplitude of the audio from the voice agent. You can use this to drive an animation when the voice agent is speaking.

By default, your voice pipeline will handle turn taking in automatic mode. But you can configure your voice pipeline to use push to talk mode. If you are using push to talk mode see the [push-to-talk instructions in the repo README](https://github.com/layercodedev/example-frontend-react?tab=readme-ov-file#push-to-talk-mode) and read about [how the VoiceAgentPushToTalk component](#voiceagentpushtotalk-optional) works below.

## Components

### AudioVisualization

The `AudioVisualization` component is used to visualize the audio from the voice agent. It uses the `agentAudioAmplitude` value returned from the useLayercodePipeline hook to drive the height of the audio bars with a simple animation.

```tsx src/ui/AudioVisualization.tsx
export function AudioVisualization({ amplitude, height = 46 }: { amplitude: number; height?: number }) {
  // Calculate the height of each bar based on amplitude
  const maxHeight = height;
  const minHeight = Math.floor(height / 6);
  const barWidth = Math.floor(minHeight);

  // Create multipliers for each bar to make middle bars taller
  const multipliers = [0.2, 0.5, 1.0, 0.5, 0.2];

  // Boost amplitude by 7 and ensure it's between 0 and 1
  const normalizedAmplitude = Math.min(Math.max(amplitude * 7, 0), 1);

  return (
    
      {multipliers.map((multiplier, index) => {
        const barHeight = minHeight + normalizedAmplitude * maxHeight * multiplier;

        return (
          
            {/* Top rounded cap */}
            
            {/* Middle straight section */}
            
            {/* Bottom rounded cap */}
            
          
        );
      })}
    
  );
}
```

### ConnectionStatusIndicator

The `ConnectionStatusIndicator` component is used to display the connection status of the voice agent. It uses the `status` value returned from the useLayercodePipeline hook to display the connection status.

```tsx src/ui/ConnectionStatusIndicator.tsx
export function ConnectionStatusIndicator({ status }: { status: string }) {
  return (
    
      
      
        {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : status === "error" ? "Connection Error" : "Disconnected"}
      
    
  );
}
```

### VoiceAgentPushToTalk (optional)

Because the `useLayercodePipeline` hook handles all of the audio streaming and playback, in most cases the microphone button is simply a visual aid and doesn't implement any logic. A simple microphone icon inside a circle will suffice in most cases.

Layercode does support 'push-to-talk' turn taking, as an alternative to automatic turn taking (read more about [turn taking](/voice-guides/turn-taking)). When using 'push-to-talk' turn taking, holding down and releasing the `MicrophoneButton` must send a websocket message to tell Layercode the user has started and finished talking. In this example, we provide an alternative `VoiceAgentPushToTalk` component, that along with the `MicrophoneButtonPushToTalk` component, handles this logic.

To use this mode, you'll need to edit `src/App.tsx` to use the `VoiceAgentPushToTalk` component instead of the `VoiceAgent` component. Then in your Layercode Dashboard, you'll need to click Edit in the Transcription section of your voice pipeline and set the Turn Taking to Push to Talk.

  ```tsx src/ui/VoiceAgentPushToTalk.tsx
  import { useLayercodePipeline } from '@layercode/react-sdk';
  import { AudioVisualization } from './AudioVisualization';
  import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
  import { MicrophoneButtonPushToTalk } from './MicrophoneButtonPushToTalk';

  export default function VoiceAgentPushToTalk() {
    const { agentAudioAmplitude, status, triggerUserTurnStarted, triggerUserTurnFinished } = useLayercodePipeline({
      pipelineId: "your-pipeline-id",
      authorizeSessionEndpoint: '/api/authorize',
      onDataMessage: (data) => {
        console.log('Received data msg', data);
      },
    });

  return (

  
    Voice Agent Demo
    
    
      
      
    
  
  ); }

  ```

  ```tsx src/ui/MicrophoneButtonPushToTalk.tsx
  import { useButtonHold } from '../hooks/useButtonHold';
  import { MicrophoneIcon } from '../icons/MicrophoneIcon';
  export function MicrophoneButtonPushToTalk({ triggerUserTurnStarted, triggerUserTurnFinished }: { triggerUserTurnStarted: () => void; triggerUserTurnFinished: () => void }) {
    // When using push-to-talk turn taking in your Layercode voice pipeline, you'll need to call triggerUserTurnStarted and triggerUserTurnFinished when the uses holds down the microphone button or spacebar.
    // The useButtonHold hook handles this state, and also include debouncing so that short accidential clicks are ignored.
    const { isVisuallyPressed, handlePressStart, handlePressEnd } = useButtonHold({
      onPressStart: triggerUserTurnStarted,
      onPressEnd: triggerUserTurnFinished,
      key: 'Space',
    });

    return (
      
        Hold while speaking
        
      
    );
  }
  ```

# Getting Started
Source: https://docs.layercode.com/getting-started

Create your first AI voice pipeline in minutes.

Learn how to create your first voice pipeline for real-time conversational AI. This guide will walk you through logging in, creating a pipeline, and testing it in our playground.

## Sign Up and Login

1. Visit [dash.layercode.com](https://dash.layercode.com)
2. Sign up or log in using email and password, then verify your email.
3. You'll be directed to your dashboard where you can manage your pipelines.

## Configure Your Voice Pipeline

After logging in for the first time, you'll be redirected to your first pipeline, created from our recommendedtemplate.

Pipelines can be customized through an intuitive UI with settings for transcription, text-to-speech, and backend (which generates the AI's response to be spoken). Click the "Edit" button to on any box in the pipeline to configure it.

Feel free to leave all the default settings as is, and skip to [testing your pipeline](#testing-your-pipeline) below.

Let's take a look at the settings available for each stage of the pipeline:

  Configure how user speech is converted to text. The default transcription provider and model are optimized for low-latency English language transcription. For multi-language support, there are specialized [transcription models](/pricing#transcription) we support.

  | Setting              | Description                                                                                         | Options / Notes                                                                                                                                                                                                                            |
  | -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | **Provider**         | The transcription provider used for speech-to-text.                                                 | [See available transcription providers](/pricing#transcription)                                                                                                                                                                            |
  | **Model**            | Select the transcription model that best fits your needs.                                           | [See available transcription models](/pricing#transcription)                                                                                                                                                                               |
  | **Turn Taking Mode** | Determines how the system detects when the user is speaking.                                        | **Automatic:** AI detects when user has finished speaking (using silence detection). **Push to Talk:** User controls when they're speaking by holding down a button. [Read more about turn taking](/voice-guides/turn-taking). |
  | **Can Interrupt**    | When Turn Taking Mode is 'Automatic': Toggle whether the user can interrupt AI whilst it's speaking | Enable or disable interruption. When disabled, the user can only respond once the AI has finished speaking.                                                                                                                                |
  Click "Save Changes" to apply your transcription settings.

  Configure the text-to-speech provider and model used to turn text generated by the backend into speech spoken by the AI. The default provider and model are optimized for low-latency English language use cases. For multi-language support, there are specialized [text-to-speech models](/pricing#text-to-speech) we support.

  We recommend experimenting with different providers, models and voices as they all have varying characteristics.

  | Setting      | Description                                                                                                                     | Options / Notes                                                                                                                                      |
  | ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Provider** | The text-to-speech provider used to generate AI speech.                                                                         | [See available text-to-speech providers](/pricing#text-to-speech)                                                                                    |
  | **Model**    | Select the TTS model that matches your quality and speed needs. The default model is often best for English language use cases. | [See available text-to-speech models](/pricing#text-to-speech)                                                                                       |
  | **Voice**    | Choose the voice that best represents your AI.                                                                                  | Select from available voices in the chosen provider/model. We recommend experimenting with different voices to find the right one for your use case. |
  Click "Save Changes" to apply your text-to-speech settings.

  The Backend receives the transcribed user's speech, and is responsible for generating the voice AI's response. Layercode offers a hosted backend or the ability to connect your own backend with a simple webhook.

  
    ### Hosted Backend
      Get started immediately with Layercode's optimized backend powered by Gemini Flash 2.0. Our hosted backend provides:

      * Ultra-low latency responses
      * Optimized for real-time conversation
      * Zero backend setup required

      | Setting             | Description                                                                                                                 |
      | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
      | **LLM Prompt**      | Configure the personality and behavior of your AI assistant.                                                                |
      | **Welcome Message** | Configure the message your AI will speak when the conversation first starts. If disabled, the user starts the conversation. |
    ### Your Own Backend
      Integrate your own backend with a simple webhook.
      [Learn how to connect your backend →](/backend-guides/connect-backend).

      Benefits of using your own backend include:

      * Complete control your voice AI response
      * Integrate with any backend language or framework, deployed to your own infrastructure
      * Total visibility into the AI's response generation
      * Use LLM providers and agent libraries you already know and love
      * Use tools, MCPs and data stores you already have
    
  

  > **Note**: Remember to set up your API keys in your chosen backend environment.

## Testing Your Pipeline

Click the "Try it out" button on your pipeline to visit the Playground.

The Playground is a pre-built frontend voice UI for testing out your voice pipeline.
If you decide to [connect your own backend](/backend-guides/connect-backend), this is a great place to test it out.
Even if you build your own frontend voice UI, the Playground will still work as a direct way to test your pipeline.

## Next Steps

Congratulations! You've created your first voice pipeline. Now you can integrate it into your application.

If you are building web or mobile based voice experience, follow our guide below. You can also choose to connect your backend to your pipeline to control the AI's response (instead of using our hosted backend). This gives you complete control over the AI's response and allows you to use your own LLM provider and agent libraries.

  - **[Build a Web Voice Agent](/frontend-guides/build-a-web-voice-agent)**
    Learn how to build a Web Voice Agent.
  

  - **[Connect Your Backend](/backend-guides/connect-backend)**
    Control your voice agent's response with your own backend.
  

# Pricing
Source: https://docs.layercode.com/pricing

Layercode pricing is transparent and simple. You only pay for what you use, in per-second increments. Silence (where the user or assistant isn't speaking) is free. The cost per second of conversation is determined by the providers and models you choose for the transcription and text-to-speech stages of your voice pipeline. For example, you will only pay the transcription provider cost for every second of user speech which is transcribed. You only pay the text-to-speech provider cost for every second of generated speech. The specific provider costs are listed below. All costs are quoted in minutes for ease of comparison, but are charged in per-second increments at 1/60th of the per-minute rate.

In addition to the provider costs, the Layercode Platform Free is charged per-second of conversation (which is the seconds of a conversation minus any silence where the user or assistant isn't speaking)

When using your own backend, Layercode charges no additional fee for this (as your backend will be making requests to any LLM you use to generate responses). When using our Hosted Backend, there is an additional fee per-second of conversation, which covers the LLM calls we make on your behalf.

The estimated per minute cost for a specific voice pipeline is displayed in the pipeline's page in the [Dashboard](https://dash.layercode.com). This is based on the average conversation cost for that voice pipeline over the past 24 hours.

The cost of a conversation session is deduced from your account credits at the end of each user session. You can top up your account with credits in the [Dashboard](https://dash.layercode.com), where a history of all charges can be viewewd. New user conversation sessions will be rejected if your account balance is zero or negative. Credits do not expire and there is no minimum credit purchase.

# Layercode Platform Fees

Charged per-second of conversation (when user or assistant is speaking) at 1/60th of the per-minute rate.

| Provider           | Price per minute |
| ------------------ | ---------------- |
| Platform Fee       | \$0.06           |
| Hosted Backend Fee | \$0.01           |
# Transcription

Charged per-second of user speech at 1/60th of the per-minute rate.

| Provider | Model            | Languages | Price per minute |
| -------- | ---------------- | --------- | ---------------- |
| Deepgram | nova-3 (English) | English   | \$0.0078         |
# Text-to-Speech

Charged per-second of generated speech at 1/60th of the per-minute rate.

| Provider   | Model                | Languages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Price per minute |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Cartesia   | sonic-2              | English (American/British/Australian/Southern), Spanish (Latin/Peninsula), French, Portuguese (Brazilian/European), Hindi, Chinese, Russian, Dutch, Japanese, Turkish, Korean, German, Swedish, Italian, Polish                                                                                                                                                                                                                                                                                                                                               | \$0.06           |
| Cartesia   | sonic-turbo          | English (American/British/Australian/Southern), Spanish (Latin/Peninsula), French, Portuguese (Brazilian/European), Hindi, Chinese, Russian, Dutch, Japanese, Turkish, Korean, German, Swedish, Italian, Polish                                                                                                                                                                                                                                                                                                                                               | \$0.06           |
| ElevenLabs | eleven\_v2\_5\_flash | English, Hindi, Portuguese, Chinese, Spanish, French, German, Japanese, Arabic, Russian, Korean, Indonesian, Italian, Dutch, Turkish, Polish, Swedish, Norwegian, Filipino, Malay, Romanian, Hungarian, Ukrainian, Greek, Czech, Danish, Finnish, Bulgarian, Croatian, Slovak, Tamil, Vietnamese, Korean, Japanese, Arabic, Russian, Portuguese, Spanish, French, German, Italian, Dutch, Turkish, Polish, Swedish, Norwegian, Filipino, Malay, Romanian, Hungarian, Ukrainian, Greek, Czech, Danish, Finnish, Bulgarian, Croatian, Slovak, Tamil, Vietnamese | \$0.15           |
## Example Costing

Suppose you use the Deepgram nova-3 (English) transcription model at **\$0.0078** per minute, the Cartesia sonic-2 text-to-speech model at **\$0.06** per minute, and the Hosted Backend at **\$0.01** per minute, along with the Platform Fee of **\$0.06** per minute.

You are only charged per second for either transcription (when the user is speaking) or text-to-speech (when the assistant is speaking)—not both at the same time. Silence (when neither is speaking) is not charged.

For each second:

* If the user is speaking, you are charged for transcription, platform fee, and (if using Hosted Backend) the hosted backend fee.
* If the assistant is speaking, you are charged for text-to-speech, platform fee, and (if using Hosted Backend) the hosted backend fee.
* If there is silence, you are not charged.

**Example:**
If a 1-minute conversation contains 20 seconds of user speech, 20 seconds of generated speech, and 20 seconds of silence, your cost would be:

* **User speech (20s):**
  (20/60) x (\$0.0078 \[transcription] + \$0.06 \[platform] + \$0.01 \[hosted backend]) = **\$0.026**
* **Assistant speech (20s):**
  (20/60) x (\$0.06 \[text-to-speech] + \$0.06 \[platform] + \$0.01 \[hosted backend]) = **\$0.043**
* **Silence (20s):**
  \$0

**Total cost for the minute of time the session took:**
**\$0.024 + \$0.043 = \$0.067**

This means you are only charged for the actual seconds of speech, and never for silence. The more silence in a conversation, the lower your total cost per minute.

# Platform Features

|                              |                                                                 |
| ---------------------------- | --------------------------------------------------------------- |
| Low-latency voice pipelines  | Production-ready, real-time voice processing with minimal delay |
| Global infrastructure        | 330+ locations worldwide for reliable, fast connections         |
| Multi-platform support       | Web, mobile, and phone (coming soon) voice agents               |
| Speech-to-text transcription | Convert user speech to text using leading providers             |
| Text-to-speech synthesis     | Convert AI responses to natural speech                          |
| Real-time audio streaming    | Continuous audio capture, processing, and playback              |
| Smart turn-taking            | Automatic conversation flow with interrupt capability           |
| Hosted Backend               | Managed backend option                                          |
| Custom backend support       | Connect your own backend with a simple webhook                  |
| Any framework support        | Works with Next.js, Express, FastAPI, and more                  |
| 32+ languages supported      | Multi-language transcription and speech synthesis               |
| 100+ voices available        | Wide selection across multiple TTS providers                    |
| Provider flexibility         | Easy switching between voice model providers                    |
| No vendor lock-in            | Switch providers and models without code changes                |
| Per-second billing           | Pay only for actual speech time, not silence                    |
| Transparent pricing          | Usage-based costs with consolidated billing                     |
# Limits

* **No concurrency limits** - Run unlimited simultaneous conversations. Layercode is built for scale.
* **Metrics data retention period** - Dashboard metrics data is retained for 90 days by default, but can be extended upon request.
* **No maximum session duration** - Sessions can run indefinitely without interruption.
* **Session idle timeout** - If a session has no activity for 10 minutes, it will disconnect. You can seamlessly reconnect the user to the same session if desired.

# Node.js Backend SDK
Source: https://docs.layercode.com/sdk-reference/node_js_sdk

API reference for the Layercode Node.js Backend SDK.

[github](https://github.com/layercodedev) [layercode-node-server-sdk](https://github.com/layercodedev/layercode-node-server-sdk).

## Introduction

The Layercode Node.js Backend SDK provides a simple way to handle the Layercode webhook in your backend. In particular, it makes it easy to return SSE events in the Layercode webhook response format. It supports all popular JavaScript runtime environments, including Node.js, Bun, and Cloudflare Workers.

See our [Backend Guides](#backend-guides) for more information about how to use the SDK in your project.

## Installation

```bash
npm install @layercode/node-server-sdk
```

## Usage

```typescript
import { streamResponse } from "@layercode/node-server-sdk";

//... inside your webhook request handler ...
return streamResponse(request, async ({ stream }) => {
  stream.tts("Hi, how can I help you today?"); // This text will be sent to Layercode, converted to speech and spoken to the user
  // Call stream.tts() as many times as you need to send multiple pieces of speech to the user
  stream.end(); // This closes the stream and must be called at the end of your response
});
// ...
```

## Reference

### streamResponse

The `streamResponse` function is the main entry point for the SDK. It takes the request body (from the Layercode webhook request) and a handler function as arguments. The handler function receives a `stream` object that can be used to send SSE events to the client.

```typescript
function streamResponse(requestBody: Record, handler: StreamResponseHandler): Response;
```

#### Parameters

* `requestBody`: The request body from the client. See [Webhook Request Payload](/api-reference/webhook_sse_api#webhook-request-payload).
* `handler`: An async function that receives a `stream` object.

#### Stream Methods

* `stream.tts(content: string)`: Sends a text to be spoken to the user (tts stands for text-to-speech).
* `stream.data(content: any)`: Sends any arbitrary data to the frontend client. Use this for updating your frontend UI.
* `stream.end()`: Closes the stream. Must be called at the end of your response.

## Examples

Here are some examples of how to use the Node SDK. See the corresponding guides for more details:

  ```typescript Express
  import express from "express";
  import { streamResponse } from "@layercode/node-server-sdk";

  const app = express();
  app.use(express.json());

  app.post("/agent", async (req, res) => {
    return streamResponse(req.body, async ({ stream }) => {
      stream.tts("Hi, how can I help you today?");
      stream.end();
    });
  });
  ```

  ```typescript Next.js
  import { streamResponse } from "@layercode/node-server-sdk";

  export const POST = async (request: Request) => {
    return streamResponse(request, async ({ stream }) => {
      stream.tts("Hi, how can I help you today?");
      stream.end();
    });
  };
  ```

  ```typescript Hono
  import { Hono } from "hono";
  import { streamResponse } from "@layercode/node-server-sdk";

  const app = new Hono();
  app.post("/agent", 
    async (c) => {
      const requestBody = await c.req.json();
      return streamResponse(requestBody, async ({ stream }) => {
        stream.tts("Hi, how can I help you today?");
        stream.end();
      });
    }
  );
  ```

## Backend Guides

  

  
  
  

  
    
    
    
    
  
  
    
    
  
  
    
  

}
    href="/backend-guides/next-js"
  />

  - **[Express (Node.js) Guide](/backend-guides/express)**

  - **[Hono (Cloudflare Workers) Guide](/backend-guides/hono)**

  - **[Python (FastAPI) Guide](/backend-guides/fastapi)**

# Python Backend SDK
Source: https://docs.layercode.com/sdk-reference/python_sdk

API reference for the Layercode Python Backend SDK.

We're working on the Python SDK. But the Layercode webhook is simple enough, that you can implement it in just a few lines of code. See the [FastAPI Backend Guide](/backend-guides/fastapi) for a full walkthrough.

# React Frontend SDK
Source: https://docs.layercode.com/sdk-reference/react_sdk

Connect your React application to Layercode pipelines and build web and mobile voice AI applications.

[github](https://github.com/layercodedev) [layercode-react-sdk](https://github.com/layercodedev/layercode-react-sdk).

## useLayercodePipeline Hook

The `useLayercodePipeline` hook provides a simple way to connect your React app to a Layercode pipeline, handling audio streaming, playback, and real-time communication.

**Example:**
  ```typescript useLayercodePipeline Hook
  import { useLayercodePipeline } from "@layercode/react";

  // Connect to a Layercode pipeline
  const {
    // Methods
    triggerUserTurnStarted,
    triggerUserTurnFinished,

    // State
    status,
    userAudioAmplitude,
    agentAudioAmplitude,
  } = useLayercodePipeline({
    pipelineId: "your-pipeline-id",
    authorizeSessionEndpoint: "/api/authorize",
    sessionId: "optional-session-id", // optional
    metadata: { userId: "user-123" }, // optional
    onConnect: ({ sessionId }) => console.log("Connected to pipeline", sessionId),
    onDisconnect: () => console.log("Disconnected from pipeline"),
    onError: (error) => console.error("Pipeline error:", error),
    onDataMessage: (data) => console.log("Received data:", data),
  });
  ```

## Hook Options

| path="pipelineId" type="string" required |
  The ID of your Layercode pipeline.

| path="authorizeSessionEndpoint" type="string" required |
  The endpoint to authorize the session (should return a `client_session_key` and `session_id`).

| path="sessionId" type="string" |
  The session ID to resume a previous session (optional).

| path="metadata" type="object" |
  Any metadata included here will be passed along to your backend with all webhooks.

| path="onConnect" type="function" |
  Callback when the connection is established. Receives an object: `{ sessionId: string | null }`.

| path="onDisconnect" type="function" |
  Callback when the connection is closed.

| path="onError" type="function" |
  Callback when an error occurs. Receives an `Error` object.

| path="onDataMessage" type="function" |
  Callback for custom data messages from the server (see `response.data` events from your backend).

## Return Values

The `useLayercodePipeline` hook returns an object with the following properties:

### State

| path="status" type="string" |
  The connection status. One of `"initializing"`, `"disconnected"`, `"connecting"`, `"connected"`, or `"error"`.

| path="userAudioAmplitude" type="number" |
  Real-time amplitude of the user's microphone input (0-1). Useful for animating UI when the user is speaking.

| path="agentAudioAmplitude" type="number" |
  Real-time amplitude of the agent's audio output (0-1). Useful for animating UI when the agent is speaking.

### Turn-taking (Push-to-Talk)

Layercode supports both automatic and push-to-talk turn-taking. For push-to-talk, use these methods to signal when the user starts and stops speaking:

| path="triggerUserTurnStarted" type="function" |
  **triggerUserTurnStarted(): void** Signals that the user has started speaking (for [push-to-talk mode](/voice-guides/turn-taking#push-to-talk-mode)). Interrupts any agent audio
  playback.

| path="triggerUserTurnFinished" type="function" |
  **triggerUserTurnFinished(): void** Signals that the user has finished speaking (for [push-to-talk mode](/voice-guides/turn-taking#push-to-talk-mode)).

## Notes & Best Practices

* The hook manages microphone access, audio streaming, and playback automatically.
* The `metadata` option allows you to set custom data which is then passed to your backend webhook (useful for user/session tracking).
* The `sessionId` can be used to resume a previous session, or omitted to start a new one.

### Authorizing Sessions

To connect a client (browser) to your Layercode voice pipeline, you must first authorize the session. The SDK will automatically send a POST request to the path (or url if your backend is on a different domain) passed in the `authorizeSessionEndpoint` option. In this endpoint, you will need to call the Layercode REST API to generate a `client_session_key` and `session_id` (if it's a new session).

> **Info**: If your backend is on a different domain, set `authorizeSessionEndpoint` to the full URL (e.g., `https://your-backend.com/api/authorize`).

**Why is this required?**
Your Layercode API key should never be exposed to the frontend. Instead, your backend acts as a secure proxy: it receives the frontend's request, then calls the Layercode authorization API using your secret API key, and finally returns the `client_session_key` to the frontend.

This also allows you to authenticate your user, and set any additional metadata that you want passed to your backend webhook.

**How it works:**

1. **Frontend:**
   The SDK automatically sends a POST request to your `authorizeSessionEndpoint` with a request body.

2. **Your Backend:**
   Your backend receives this request, then makes a POST request to the Layercode REST API `/v1/pipelines/authorize_session` endpoint, including your `LAYERCODE_API_KEY` as a Bearer token in the headers.

3. **Layercode:**
   Layercode responds with a `client_session_key` (and a `session_id`), which your backend returns to the frontend.

4. **Frontend:**
   The SDK uses the `client_session_key` to establish a secure WebSocket connection to Layercode.

**Example backend authorization endpoint code:**

  ```ts Next.js app/api/authorize/route.ts
  export const dynamic = "force-dynamic";
  import { NextResponse } from "next/server";

  export const POST = async (request: Request) => {
    // Here you could do any user authorization checks you need for your app
    const endpoint = "https://api.layercode.com/v1/pipelines/authorize_session";
    const apiKey = process.env.LAYERCODE_API_KEY;
    if (!apiKey) {
      throw new Error("LAYERCODE_API_KEY is not set.");
    }
    const requestBody = await request.json();
    if (!requestBody || !requestBody.pipeline_id) {
      throw new Error("Missing pipeline_id in request body.");
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      return NextResponse.json(await response.json());
    } catch (error: any) {
      console.log("Layercode authorize session response error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  };
  ```

  ```ts Hono
  import { Context } from 'hono';
  import { env } from 'cloudflare:workers';

  export const onRequestPost = async (c: Context) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        return c.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      return c.json(data);
    } catch (error) {
      return c.json({ error: error });
    }
  };
  ```

  ```ts ExpressJS
  import type { RequestHandler } from 'express';

  export const onRequestPost: RequestHandler = async (req, res) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        res.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      res.json(data);
    } catch (error) {
      res.json({ error: error });
    }
  };
  ```

  ```python Python
  import os
  import httpx
  from fastapi.responses import JSONResponse

  @app.post("/authorize")
  async def authorize_endpoint(request: Request):
      api_key = os.getenv("LAYERCODE_API_KEY")
      if not api_key:
          return JSONResponse({"error": "LAYERCODE_API_KEY is not set."}, status_code=500)
      try:
          body = await request.json()
      except Exception:
          return JSONResponse({"error": "Invalid JSON body."}, status_code=400)
      if not body or not body.get("pipeline_id"):
          return JSONResponse({"error": "Missing pipeline_id in request body."}, status_code=400)
      endpoint = "https://api.layercode.com/v1/pipelines/authorize_session"
      try:
          async with httpx.AsyncClient() as client:
              response = await client.post(
                  endpoint,
                  headers={
                      "Content-Type": "application/json",
                      "Authorization": f"Bearer {api_key}",
                  },
                  json=body,
              )
          if response.status_code != 200:
              return JSONResponse({"error": response.text}, status_code=500)
          return JSONResponse(response.json())
      except Exception as error:
          print("Layercode authorize session response error:", str(error))
          return JSONResponse({"error": str(error)}, status_code=500)
  ```

For a Python backend example see the [FastAPI backend guide](/backend-guides/fastapi).

# Vanilla JS Frontend SDK
Source: https://docs.layercode.com/sdk-reference/vanilla_js_sdk

API reference for the Layercode Vanilla JS Frontend SDK.

[github](https://github.com/layercodedev) [layercode-js-sdk](https://github.com/layercodedev/layercode-js-sdk).

## LayercodeClient

The `LayercodeClient` is the core client for all JavaScript frontend SDKs, providing audio recording, playback, and real-time communication with the Layercode pipeline.

**Example:**
  ```javascript
  import LayercodeClient from "https://cdn.jsdelivr.net/npm/@layercode/js-sdk@latest/dist/layercode-js-sdk.esm.js";

  window.layercode = new LayercodeClient({
    pipelineId: "your-pipeline-id",
    sessionId: "your-session-id", // optional
    authorizeSessionEndpoint: "/api/authorize",
    metadata: { userId: "123" }, // optional
    onConnect: ({ sessionId }) => console.log("connected", sessionId),
    onDisconnect: () => console.log("disconnected"),
    onError: (err) => console.error("error", err),
    onDataMessage: (msg) => console.log("data message", msg),
    onUserAmplitudeChange: (amp) => console.log("user amplitude", amp),
    onAgentAmplitudeChange: (amp) => console.log("agent amplitude", amp),
    onStatusChange: (status) => console.log("status", status),
  });

  window.layercode.connect();
  ```

### Usage Example

### Constructor Options

| path="options" type="object" required |
  Options for the LayercodeClient.

| path="options.pipelineId" type="string" required |
  The ID of your Layercode pipeline.

| path="options.sessionId" type="string" |
  The session ID to resume a previous session (optional).

| path="options.authorizeSessionEndpoint" type="string" required |
  The endpoint to authorize the session (should return a `client_session_key` and `session_id`).

| path="options.metadata" type="object" |
  Optional metadata to send with the session authorization request.

| path="options.onConnect" type="function" |
  Callback when the client connects. Receives an object: `{ sessionId: string | null }`.

| path="options.onDisconnect" type="function" |
  Callback when the client disconnects.

| path="options.onError" type="function" |
  Callback when an error occurs. Receives an `Error` object.

| path="options.onDataMessage" type="function" |
  Callback for custom data messages from the server.

| path="options.onUserAmplitudeChange" type="function" |
  Callback for changes in the user's microphone amplitude (number, 0-1).

| path="options.onAgentAmplitudeChange" type="function" |
  Callback for changes in the agent's audio amplitude (number, 0-1).

| path="options.onStatusChange" type="function" |
  Callback when the client's status changes. Receives a string: `"disconnected" | "connecting" | "connected" | "error"`.

### Methods

| path="connect" type="function" required |
  **connect(): Promise\** Connects to the Layercode pipeline, authorizes the session, and starts audio capture and playback.

| path="disconnect" type="function" required |
  **disconnect(): Promise\** Disconnects from the Layercode pipeline, stops audio capture and playback, and closes the WebSocket.

### Turn-taking (Push-to-Talk)

Layercode supports both automatic and push-to-talk turn-taking. For push-to-talk, use these methods to signal when the user starts and stops speaking:

| path="triggerUserTurnStarted" type="function" |
  **triggerUserTurnStarted(): Promise\** Signals that the user has started speaking (for [push-to-talk mode](/voice-guides/turn-taking#push-to-talk-mode)). Interrupts
  any agent audio playback.

| path="triggerUserTurnFinished" type="function" |
  **triggerUserTurnFinished(): Promise\** Signals that the user has finished speaking (for [push-to-talk mode](/voice-guides/turn-taking#push-to-talk-mode)).

## Events & Callbacks

* **onConnect**: Called when the connection is established. Receives `{ sessionId }`.
* **onDisconnect**: Called when the connection is closed.
* **onError**: Called on any error (authorization, WebSocket, audio, etc).
* **onDataMessage**: Called when a custom data message is received from the server (see `response.data` events from your backend).
* **onUserAmplitudeChange**: Called with the user's microphone amplitude (0-1).
* **onAgentAmplitudeChange**: Called with the agent's audio amplitude (0-1).
* **onStatusChange**: Called when the status changes (`"disconnected"`, `"connecting"`, `"connected"`, `"error"`).

## Notes & Best Practices

* The SDK manages microphone access, audio streaming, and playback automatically.
* The `metadata` option allows you to set custom data which is then passed to your backend webhook (useful for user/session tracking).
* The `sessionId` can be used to resume a previous session, or omitted to start a new one.

### Authorizing Sessions

To connect a client (browser) to your Layercode voice pipeline, you must first authorize the session. The SDK will automatically send a POST request to the path (or url if your backend is on a different domain) passed in the `authorizeSessionEndpoint` option. In this endpoint, you will need to call the Layercode REST API to generate a `client_session_key` and `session_id` (if it's a new session).

> **Info**: If your backend is on a different domain, set `authorizeSessionEndpoint` to the full URL (e.g., `https://your-backend.com/api/authorize`).

**Why is this required?**
Your Layercode API key should never be exposed to the frontend. Instead, your backend acts as a secure proxy: it receives the frontend's request, then calls the Layercode authorization API using your secret API key, and finally returns the `client_session_key` to the frontend.

This also allows you to authenticate your user, and set any additional metadata that you want passed to your backend webhook.

**How it works:**

1. **Frontend:**
   The SDK automatically sends a POST request to your `authorizeSessionEndpoint` with a request body.

2. **Your Backend:**
   Your backend receives this request, then makes a POST request to the Layercode REST API `/v1/pipelines/authorize_session` endpoint, including your `LAYERCODE_API_KEY` as a Bearer token in the headers.

3. **Layercode:**
   Layercode responds with a `client_session_key` (and a `session_id`), which your backend returns to the frontend.

4. **Frontend:**
   The SDK uses the `client_session_key` to establish a secure WebSocket connection to Layercode.

**Example backend authorization endpoint code:**

  ```ts Next.js app/api/authorize/route.ts
  export const dynamic = "force-dynamic";
  import { NextResponse } from "next/server";

  export const POST = async (request: Request) => {
    // Here you could do any user authorization checks you need for your app
    const endpoint = "https://api.layercode.com/v1/pipelines/authorize_session";
    const apiKey = process.env.LAYERCODE_API_KEY;
    if (!apiKey) {
      throw new Error("LAYERCODE_API_KEY is not set.");
    }
    const requestBody = await request.json();
    if (!requestBody || !requestBody.pipeline_id) {
      throw new Error("Missing pipeline_id in request body.");
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      return NextResponse.json(await response.json());
    } catch (error: any) {
      console.log("Layercode authorize session response error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  };
  ```

  ```ts Hono
  import { Context } from 'hono';
  import { env } from 'cloudflare:workers';

  export const onRequestPost = async (c: Context) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        return c.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      return c.json(data);
    } catch (error) {
      return c.json({ error: error });
    }
  };
  ```

  ```ts ExpressJS
  import type { RequestHandler } from 'express';

  export const onRequestPost: RequestHandler = async (req, res) => {
    try {
      const response = await fetch("https://api.layercode.com/v1/pipelines/authorize_session", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LAYERCODE_API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: "your-pipeline-id", session_id: null }),
      });
      if (!response.ok) {
        console.log('response not ok', response.statusText);
        res.json({ error: response.statusText });
      }
      const data: { client_session_key: string } = await response.json();
      res.json(data);
    } catch (error) {
      res.json({ error: error });
    }
  };
  ```

  ```python Python
  import os
  import httpx
  from fastapi.responses import JSONResponse

  @app.post("/authorize")
  async def authorize_endpoint(request: Request):
      api_key = os.getenv("LAYERCODE_API_KEY")
      if not api_key:
          return JSONResponse({"error": "LAYERCODE_API_KEY is not set."}, status_code=500)
      try:
          body = await request.json()
      except Exception:
          return JSONResponse({"error": "Invalid JSON body."}, status_code=400)
      if not body or not body.get("pipeline_id"):
          return JSONResponse({"error": "Missing pipeline_id in request body."}, status_code=400)
      endpoint = "https://api.layercode.com/v1/pipelines/authorize_session"
      try:
          async with httpx.AsyncClient() as client:
              response = await client.post(
                  endpoint,
                  headers={
                      "Content-Type": "application/json",
                      "Authorization": f"Bearer {api_key}",
                  },
                  json=body,
              )
          if response.status_code != 200:
              return JSONResponse({"error": response.text}, status_code=500)
          return JSONResponse(response.json())
      except Exception as error:
          print("Layercode authorize session response error:", str(error))
          return JSONResponse({"error": str(error)}, status_code=500)
  ```

For a Python backend example see the [FastAPI backend guide](/backend-guides/fastapi).

# Build a Phone Agent (coming soon)
Source: https://docs.layercode.com/telephony-guides/build-a-phone-agent

Build an agent that makes outgoing or receives incoming phone calls with Layercode.

> **Note**: We're working full steam ahead on this feature. Check back soon!

# Create a tunnel for webhooks
Source: https://docs.layercode.com/tunnelling

How to expose your local backend to Layercode using a tunnel.

> **Note**: Layercode needs to send a webhook to your backend to generate agent responses. If you're running your backend locally, you'll need to expose it to the internet using a tunnel
  service.

## Setting Up a Tunnel with Cloudflared

We recommend using [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/), which is free for development.

  **Start the tunnel**
    Run the following command to expose your local server:

    ```bash
    npx cloudflared tunnel --url http://localhost:3000
    ```
  

  **Copy your tunnel URL**
    After starting, cloudflared will print a public URL in your terminal, e.g.:

    ```
    https://my-tunnel-name.trycloudflare.com
    ```

    Add the path of your backend's webhook endpoint to the URL, e.g.:

    ```
    https://my-tunnel-name.trycloudflare.com/api/webhook
    ```

    `/api/webhook` is just an example. Your actual endpoint may be different depending on your backend configuration.
  

  **Update your Layercode pipeline**
    1. Go to the [Layercode dashboard](https://dash.layercode.com).
    2. Click on your pipeline.
    3. Click the Edit button in the 'Your Backend' box.
    4. Enter your Webhook URL (from the previous step).
  

  **Test your agent**Open the pipeline Playground tab and start speaking to your voice agent!

  **Troubleshooting**
    If you're having trouble, make sure your backend server is running and listening on the specified port (e.g., 3000). You can also visit the Webhook Logs tab in the pipeline to see the webhook requests being sent and any errors returned.
  

> **Warning**: Every time you restart the cloudflared tunnel, the assigned public URL will change. Be sure to update the webhook URL in the Layercode dashboard each time you restart the tunnel.

## Alternative Tunneling Solutions

Besides cloudflared, you can also use other tunneling solutions like [ngrok](https://ngrok.com/) to expose your local backend.

# Turn Taking
Source: https://docs.layercode.com/voice-guides/turn-taking

Choosing the right turn taking strategy for your voice application is key to building a successful voice AI experience. Layercode supports multiple turn taking modes, so you can choose the best one for your use case. The best Turn Taking Mode to use depends on your voice application's use case and the environment your users are in. You may need to experiment with different modes to find the best fit for your application.

## Automatic Mode

For most use cases, the default "Automatic" turn taking mode (with Can Interrupt enabled) is the best option to begin with. This will let users speak freely to the AI, and interrupt it at any time. But if your users are in a noisy environment you may find that this noise inadvertently interrupts the AI's response mid sentence.

One solution to this is to disable Can Interrupt. In this case the user's response will only be listened to after the AI has finished speaking. The user will not be able to interrupt the AI mid sentence, and will always have to wait for the AI to finish. The downside of this approach is that users may become impatient if the AI's responses are long.

## Push to Talk Mode

When building voice AI for the web or mobile, you can enable Push to Talk mode. This mode requires a small config change in your web or app frontend (we include this in all our demo apps).

In this mode, the user must hold down a button to speak. When the user holds down the button, their speech is transcribed. When the user releases the button, the AI will respond. This mode is great for noisy environments, or situations where you want the user to have complete control over the conversation.

# Welcome to Layercode
Source: https://docs.layercode.com/welcome

The fastest way to add production-ready, low-latency voice to your AI agents.

Our cloud platform powers the real-time infrastructure required to deliver responsive, engaging voice interfaces—so you can focus on building exceptional conversational experiences.

## Why Layercode?

* **Low-latency, production-grade voice pipelines**\
  Deliver natural, real-time conversations to your users, wherever they are.
* **Full control, zero lock-in**\
  Easily configure your pipeline, swap between leading voice model providers, and plug in your own agent backend with a single webhook.
* **Build voice agents for the web, mobile or phone**\
  Add voice into your web and mobile apps. Coming soon: handle incoming and outgoing calls with your voice agent.
* **Powerful, flexible audio pipelines**\
  Mix and match audio processing plugins, transcription, and text-to-speech models. Support for 32+ languages and 100+ voices.
* **Global scale and reliability**\
  Our network spans 330+ locations worldwide, ensuring every interaction is smooth, fast and reliable - wherever your users are.
* **Transparent pricing and simplified billing**\
  Only pay for what you use, per minute. No concurrency limits. We also consolidate your voice model provider costs into a single, simple bill.

## What can you build?

Layercode is built for developers who want to:

* Add voice to LLM-powered agents and apps
* Build custom, multi-lingual voice assistants
* Support for web, mobile and phone (coming soon) voice agents
* Integrate voice into customer support, sales, training, and more
* Use the latest voice AI models - without vendor lock-in

## Ready to get started?

- **[Get Started](/getting-started)**
  Create your first real-time voice pipeline.

