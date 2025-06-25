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
      messages: [{ role: 'user', content: [{ type: 'text', text: requestBody.text }] }],
      onFinish: async ({ response }) => {
        stream.end(); // We must call stream.end() here to tell Layercode that the assistant's response has finished
      },
    });
    // Here we return the textStream chunks as SSE messages to Layercode, to be spoken to the user
    await stream.ttsTextStream(textStream);
  });
}; 