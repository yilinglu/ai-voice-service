export const maxDuration = 300; // We set a generous Vercel max function duration to allow for long running agents
export const dynamic = 'force-dynamic';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { streamResponse, verifySignature } from '@layercode/node-server-sdk';
import { withEnhancedLogging } from '../../../lib/request-logger';
import logger from '../../../lib/logger';

// Check for required environment variables
const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const layercodeWebhookSecret = process.env.LAYERCODE_WEBHOOK_SECRET;

if (!googleApiKey) {
  logger.error('❌ GOOGLE_GENERATIVE_AI_API_KEY environment variable is missing');
}

if (!layercodeWebhookSecret) {
  logger.error('❌ LAYERCODE_WEBHOOK_SECRET environment variable is missing');
}

const google = createGoogleGenerativeAI({
  apiKey: googleApiKey || 'missing-api-key',
});

const SYSTEM_PROMPT =
  "You are a helpful conversation assistant. You should respond to the user's message in a conversational manner. Your output will be spoken by a TTS model. You should respond in a way that is easy for the TTS model to speak and sound natural.";

// POST request handler for Layercode incoming webhook, per turn of the conversation
async function agentHandler(request: Request) {
  const requestBody = await request.json();
  
  const signature = request.headers.get('layercode-signature') || '';
  const secret = layercodeWebhookSecret || '';
  const payload = JSON.stringify(requestBody);
  
  if (!secret) {
    logger.error('Cannot verify webhook signature - LAYERCODE_WEBHOOK_SECRET is missing');
    return new Response('Server configuration error', { status: 500 });
  }
  
  const isValid = verifySignature({ payload, signature, secret });

  if (!isValid) {
    logger.error('Invalid webhook signature', {
      signature: signature ? '***' : 'missing',
      secretConfigured: !!secret,
      payloadLength: payload.length
    });
    return new Response('Unauthorized', { status: 401 });
  }

  return streamResponse(requestBody, async ({ stream }) => {
    if (!googleApiKey) {
      logger.error('Cannot generate AI response - GOOGLE_GENERATIVE_AI_API_KEY is missing');
      stream.tts('I apologize, but I am currently experiencing technical difficulties. Please try again later.');
      stream.end();
      return;
    }
    
    const { textStream } = streamText({
      model: google('gemini-2.0-flash-001'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: requestBody.text }] }],
      onFinish: async ({ response }) => {
        // Extract and process the complete AI response from the assistant's message
        const assistantMessage = response.messages.find(msg => msg.role === 'assistant');
        let aiResponse = 'No text response generated';
        const nonTextContent: Array<{
          type: string;
          toolName?: string;
          toolCallId?: string;
          args?: unknown;
          part?: unknown;
          fileId?: string;
          fileName?: string;
        }> = [];
        
        if (assistantMessage?.content) {
          // Handle content which can be string or array of parts
          if (typeof assistantMessage.content === 'string') {
            aiResponse = assistantMessage.content;
          } else if (Array.isArray(assistantMessage.content)) {
            // Process each content part
            assistantMessage.content.forEach(part => {
              if (typeof part === 'object' && part && 'type' in part) {
                switch (part.type) {
                  case 'text':
                    aiResponse = part.text as string;
                    break;
                  case 'tool-call':
                    nonTextContent.push({
                      type: 'tool-call',
                      toolName: part.toolName,
                      toolCallId: part.toolCallId,
                      args: part.args
                    });
                    break;
                  case 'file':
                    nonTextContent.push({
                      type: 'file',
                      part: part
                    });
                    break;
                  case 'reasoning':
                    nonTextContent.push({
                      type: 'reasoning',
                      part: part
                    });
                    break;
                  case 'redacted-reasoning':
                    nonTextContent.push({
                      type: 'redacted-reasoning',
                      part: part
                    });
                    break;
                  default:
                    nonTextContent.push({
                      type: 'unknown',
                      part: part
                    });
                }
              }
            });
          }
        }
        
        // Log the complete AI response with all content types
        logger.info('AI Response:', {
          userMessage: requestBody.text,
          aiResponse: aiResponse,
          nonTextContent: nonTextContent.length > 0 ? nonTextContent : undefined,
          sessionId: requestBody.session_id,
          turnId: requestBody.turn_id
        });
        
        // Handle non-text content for voice agent
        if (nonTextContent.length > 0) {
          nonTextContent.forEach(content => {
            switch (content.type) {
              case 'tool-call':
                logger.info('Tool call detected:', {
                  toolName: content.toolName,
                  toolCallId: content.toolCallId,
                  args: content.args
                });
                // For voice agent, we might want to announce tool usage
                // stream.tts(`I'm using ${content.toolName} to help you.`);
                break;
              case 'file':
                logger.info('File reference detected:', {
                  fileId: content.fileId,
                  fileName: content.fileName
                });
                // stream.tts(`I found a file: ${content.fileName}`);
                break;
              case 'reasoning':
                logger.debug('AI reasoning:', {
                  reasoning: content.part
                });
                // Usually don't announce reasoning to user
                break;
            }
          });
        }
        
        stream.end(); // We must call stream.end() here to tell Layercode that the assistant's response has finished
      },
    });
    
    // Stream the text chunks to Layercode for TTS conversion
    for await (const chunk of textStream) {
      // Send each chunk to Layercode for immediate TTS processing
      stream.tts(chunk);
    }
  });
}

// Export the enhanced wrapped handler with webhook context
export const POST = withEnhancedLogging(agentHandler, {
  name: 'layercode-agent-webhook',
  sensitiveFields: ['text', 'session_id', 'turn_id', 'connection_id', 'layercode-signature']
}); 