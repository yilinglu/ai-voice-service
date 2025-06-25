export const maxDuration = 300; // We set a generous Vercel max function duration to allow for long running agents
export const dynamic = 'force-dynamic';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { streamResponse, verifySignature } from '@layercode/node-server-sdk';
import { withEnhancedLogging } from '../../../lib/request-logger';
import logger from '../../../lib/logger';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const SYSTEM_PROMPT =
  "You are a helpful conversation assistant. You should respond to the user's message in a conversational manner. Your output will be spoken by a TTS model. You should respond in a way that is easy for the TTS model to speak and sound natural.";

// POST request handler for Layercode incoming webhook, per turn of the conversation
async function agentHandler(request: Request) {
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
    let fullResponseText = '';
    
    const { textStream } = streamText({
      model: google('gemini-2.0-flash-001'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: requestBody.text }] }],
      onFinish: async () => {
        // Log the complete AI response
        logger.info('AI Response:', {
          userMessage: requestBody.text,
          aiResponse: fullResponseText,
          sessionId: requestBody.session_id,
          turnId: requestBody.turn_id
        });
        
        stream.end(); // We must call stream.end() here to tell Layercode that the assistant's response has finished
      },
    });
    
    // Accumulate the text stream and log it
    for await (const chunk of textStream) {
      fullResponseText += chunk;
    }
    
    // Here we return the textStream chunks as SSE messages to Layercode, to be spoken to the user
    await stream.ttsTextStream(textStream);
  });
}

// Export the enhanced wrapped handler with webhook context
export const POST = withEnhancedLogging(agentHandler, {
  name: 'layercode-agent-webhook',
  sensitiveFields: ['text', 'session_id', 'turn_id', 'connection_id', 'layercode-signature']
}); 