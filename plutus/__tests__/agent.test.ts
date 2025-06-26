import { POST } from '../app/api/agent/route';
import logger from '../lib/logger';

// Mock the external dependencies
jest.mock('@layercode/node-server-sdk', () => ({
  streamResponse: jest.fn(() => Promise.resolve(new Response('OK'))),
  verifySignature: jest.fn(),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => (modelName: string) => ({
    modelName,
  })),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

import { verifySignature, streamResponse } from '@layercode/node-server-sdk';
import { streamText } from 'ai';

const mockVerifySignature = verifySignature as jest.MockedFunction<typeof verifySignature>;
const mockStreamResponse = streamResponse as jest.MockedFunction<typeof streamResponse>;
const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;

jest.mock('../lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('Agent API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LAYERCODE_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-api-key';
  });

  it('should return 401 when signature is invalid', async () => {
    mockVerifySignature.mockReturnValue(false);

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'invalid-signature'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockVerifySignature).toHaveBeenCalledWith({
      payload: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      }),
      signature: 'invalid-signature',
      secret: 'test-webhook-secret'
    });
  });

  it('should handle missing webhook secret', async () => {
    delete process.env.LAYERCODE_WEBHOOK_SECRET;
    mockVerifySignature.mockReturnValue(false);

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'test-signature'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockVerifySignature).toHaveBeenCalledWith({
      payload: expect.any(String),
      signature: 'test-signature',
      secret: ''
    });
  });

  it('should handle missing signature header', async () => {
    mockVerifySignature.mockReturnValue(false);

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockVerifySignature).toHaveBeenCalledWith({
      payload: expect.any(String),
      signature: '',
      secret: 'test-webhook-secret'
    });
  });

  it('should log error when signature verification fails', async () => {
    mockVerifySignature.mockReturnValue(false);

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'invalid-signature'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    await POST(request);

    expect(logger.error).toHaveBeenCalledWith(
      'Invalid webhook signature',
      expect.objectContaining({
        signature: expect.any(String),
        secretConfigured: expect.any(Boolean),
        payloadLength: expect.any(Number),
      })
    );
  });

  it('should properly stream AI response chunks to Layercode without double consumption', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    // Mock stream response to capture the handler function
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    // Create mock text stream with multiple chunks
    const mockTextStream = (async function* () {
      yield 'Hello';
      yield ' there';
      yield '! How can I help you today?';
    })();

    // Capture the onFinish callback
    let capturedOnFinish: any;
    
    // Mock the streamText function with a simpler approach
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    // Mock stream object with spies
    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);

    // Verify streamResponse was called
    expect(mockStreamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      }),
      expect.any(Function)
    );

    // Execute the captured handler to test the streaming logic
    await capturedHandler({ stream: mockStream });

    // Manually trigger the onFinish callback to simulate stream completion
    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
          { role: 'assistant', content: [{ type: 'text', text: 'Hello there! How can I help you today?' }] }
        ] 
      } 
    });

    // Verify that stream.tts() was called for each chunk
    expect(mockStream.tts).toHaveBeenCalledTimes(3);
    expect(mockStream.tts).toHaveBeenNthCalledWith(1, 'Hello');
    expect(mockStream.tts).toHaveBeenNthCalledWith(2, ' there');
    expect(mockStream.tts).toHaveBeenNthCalledWith(3, '! How can I help you today?');

    // Verify that stream.end() was called at the end
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify that the AI response was logged
    expect(logger.info).toHaveBeenCalledWith(
      'AI Response:',
      expect.objectContaining({
        userMessage: 'Hello',
        aiResponse: 'Hello there! How can I help you today?',
        sessionId: 'test-session',
        turnId: 'test-turn'
      })
    );

    // Verify streamText was called with correct parameters
    expect(mockStreamText).toHaveBeenCalledWith({
      model: expect.any(Object),
      system: expect.stringContaining('helpful conversation assistant'),
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
      onFinish: expect.any(Function),
    });
  });

  it('should handle empty AI response gracefully', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    // Mock empty text stream
    const mockTextStream = (async function* () {
      // No chunks
    })();

    // Capture the onFinish callback
    let capturedOnFinish: any;
    
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    // Manually trigger the onFinish callback to simulate stream completion
    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] }
          // No assistant message - simulating empty response
        ] 
      } 
    });

    // Verify that stream.tts() was never called (no chunks)
    expect(mockStream.tts).not.toHaveBeenCalled();

    // Verify that stream.end() was still called
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify that empty response was logged
    expect(logger.info).toHaveBeenCalledWith(
      'AI Response:',
      expect.objectContaining({
        userMessage: 'Hello',
        aiResponse: 'No text response generated',
        sessionId: 'test-session',
        turnId: 'test-turn'
      })
    );
  });

  it('should handle requests with connection_id field', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    const mockTextStream = (async function* () {
      yield 'Hello there!';
    })();

    let capturedOnFinish: any;
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'Hello',
        session_id: 'u6wue1qa28ikxje8zobq6337',
        turn_id: 'p9c7xvlpf20hfs4j1bwxyy8x',
        connection_id: 'conn_abc123',
        type: 'message'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
          { role: 'assistant', content: [{ type: 'text', text: 'Hello there!' }] }
        ] 
      } 
    });

    // Verify that streamResponse was called with all fields including connection_id
    expect(mockStreamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello',
        session_id: 'u6wue1qa28ikxje8zobq6337',
        turn_id: 'p9c7xvlpf20hfs4j1bwxyy8x',
        connection_id: 'conn_abc123',
        type: 'message'
      }),
      expect.any(Function)
    );

    expect(mockStream.tts).toHaveBeenCalledWith('Hello there!');
    expect(mockStream.end).toHaveBeenCalledTimes(1);
  });

  it('should handle AI responses with newline characters', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    const mockTextStream = (async function* () {
      yield 'I\'d love to help, but I need to hear the joke first! Tell me the joke, and I\'ll do my best to explain why it\'s funny.\n';
    })();

    let capturedOnFinish: any;
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'Do you know why this joke is funny?',
        session_id: 'u6wue1qa28ikxje8zobq6337',
        turn_id: 'p9c7xvlpf20hfs4j1bwxyy8x',
        type: 'message'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Do you know why this joke is funny?' }] },
          { role: 'assistant', content: [{ type: 'text', text: 'I\'d love to help, but I need to hear the joke first! Tell me the joke, and I\'ll do my best to explain why it\'s funny.\n' }] }
        ] 
      } 
    });

    // Verify that newline characters are handled properly
    expect(mockStream.tts).toHaveBeenCalledWith('I\'d love to help, but I need to hear the joke first! Tell me the joke, and I\'ll do my best to explain why it\'s funny.\n');
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify logging includes the response with newlines
    expect(logger.info).toHaveBeenCalledWith(
      'AI Response:',
      expect.objectContaining({
        userMessage: 'Do you know why this joke is funny?',
        aiResponse: 'I\'d love to help, but I need to hear the joke first! Tell me the joke, and I\'ll do my best to explain why it\'s funny.\n',
        sessionId: 'u6wue1qa28ikxje8zobq6337',
        turnId: 'p9c7xvlpf20hfs4j1bwxyy8x'
      })
    );
  });

  it('should handle AI responses with tool calls', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    const mockTextStream = (async function* () {
      yield 'Let me check the weather for you.';
    })();

    let capturedOnFinish: any;
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'What\'s the weather like?',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'What\'s the weather like?' }] },
          { 
            role: 'assistant', 
            content: [
              { type: 'text', text: 'Let me check the weather for you.' },
              { type: 'tool-call', toolName: 'get_weather', toolCallId: 'call_123', args: { location: 'current' } }
            ] 
          }
        ] 
      } 
    });

    expect(mockStream.tts).toHaveBeenCalledWith('Let me check the weather for you.');
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify that tool call was logged
    expect(logger.info).toHaveBeenCalledWith(
      'AI Response:',
      expect.objectContaining({
        userMessage: 'What\'s the weather like?',
        aiResponse: 'Let me check the weather for you.',
        nonTextContent: [
          {
            type: 'tool-call',
            toolName: 'get_weather',
            toolCallId: 'call_123',
            args: { location: 'current' }
          }
        ],
        sessionId: 'test-session',
        turnId: 'test-turn'
      })
    );
  });

  it('should handle AI responses with file references', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    const mockTextStream = (async function* () {
      yield 'I found a document that might help.';
    })();

    let capturedOnFinish: any;
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'What documents do you have?',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'What documents do you have?' }] },
          { 
            role: 'assistant', 
            content: [
              { type: 'text', text: 'I found a document that might help.' },
              { type: 'file', id: 'file_123', filename: 'report.pdf' }
            ] 
          }
        ] 
      } 
    });

    expect(mockStream.tts).toHaveBeenCalledWith('I found a document that might help.');
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify that file reference was logged
    expect(logger.info).toHaveBeenCalledWith(
      'AI Response:',
      expect.objectContaining({
        userMessage: 'What documents do you have?',
        aiResponse: 'I found a document that might help.',
        nonTextContent: [
          {
            type: 'file',
            part: {
              type: 'file',
              id: 'file_123',
              filename: 'report.pdf'
            }
          }
        ],
        sessionId: 'test-session',
        turnId: 'test-turn'
      })
    );
  });

  it('should handle AI responses with reasoning content', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    const mockTextStream = (async function* () {
      yield 'Based on your question, I think the answer is...';
    })();

    let capturedOnFinish: any;
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: 'Why is the sky blue?',
        session_id: 'test-session',
        turn_id: 'test-turn',
        type: 'message'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Why is the sky blue?' }] },
          { 
            role: 'assistant', 
            content: [
              { type: 'text', text: 'Based on your question, I think the answer is...' },
              { type: 'reasoning', content: 'The user is asking about physics. I should explain Rayleigh scattering.' }
            ] 
          }
        ] 
      } 
    });

    expect(mockStream.tts).toHaveBeenCalledWith('Based on your question, I think the answer is...');
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify that reasoning was logged but not spoken
    expect(logger.info).toHaveBeenCalledWith(
      'AI Response:',
      expect.objectContaining({
        userMessage: 'Why is the sky blue?',
        aiResponse: 'Based on your question, I think the answer is...',
        nonTextContent: [
          {
            type: 'reasoning',
            part: expect.objectContaining({
              type: 'reasoning',
              content: 'The user is asking about physics. I should explain Rayleigh scattering.'
            })
          }
        ],
        sessionId: 'test-session',
        turnId: 'test-turn'
      })
    );

    // Verify that reasoning was also logged separately at debug level
    expect(logger.debug).toHaveBeenCalledWith(
      'AI reasoning:',
      expect.objectContaining({
        reasoning: expect.objectContaining({
          type: 'reasoning',
          content: 'The user is asking about physics. I should explain Rayleigh scattering.'
        })
      })
    );
  });

  it('should handle session.start type requests', async () => {
    mockVerifySignature.mockReturnValue(true);
    
    let capturedHandler: any;
    mockStreamResponse.mockImplementation((requestBody, handler) => {
      capturedHandler = handler;
      return new Response('OK');
    });

    const mockTextStream = (async function* () {
      yield 'Welcome! How can I help you today?';
    })();

    let capturedOnFinish: any;
    mockStreamText.mockImplementation((options) => {
      capturedOnFinish = options.onFinish;
      return {
        textStream: mockTextStream as any,
      } as any;
    });

    const request = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'layercode-signature': 'valid-signature'
      },
      body: JSON.stringify({
        text: '',
        session_id: 'new-session-123',
        turn_id: 'turn-456',
        type: 'session.start'
      })
    });

    const mockStream = {
      tts: jest.fn(),
      end: jest.fn(),
    };

    await POST(request);
    await capturedHandler({ stream: mockStream });

    await capturedOnFinish({ 
      response: { 
        messages: [
          { role: 'assistant', content: [{ type: 'text', text: 'Welcome! How can I help you today?' }] }
        ] 
      } 
    });

    expect(mockStream.tts).toHaveBeenCalledWith('Welcome! How can I help you today?');
    expect(mockStream.end).toHaveBeenCalledTimes(1);

    // Verify session.start was handled correctly
    expect(mockStreamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '',
        session_id: 'new-session-123',
        turn_id: 'turn-456',
        type: 'session.start'
      }),
      expect.any(Function)
    );
  });
}); 