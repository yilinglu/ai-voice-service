import { POST } from '../app/api/agent/route';

// Mock the external dependencies
jest.mock('@layercode/node-server-sdk', () => ({
  streamResponse: jest.fn(() => Promise.resolve(new Response('OK'))),
  verifySignature: jest.fn(),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => ({
    'gemini-2.0-flash-001': jest.fn(),
  })),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

import { verifySignature } from '@layercode/node-server-sdk';

const mockVerifySignature = verifySignature as jest.MockedFunction<typeof verifySignature>;

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

    expect(console.error).toHaveBeenCalledWith(
      'Invalid signature',
      'invalid-signature',
      'test-webhook-secret',
      expect.any(String)
    );
  });
}); 