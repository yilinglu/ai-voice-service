import { POST } from '../app/api/authorize/route';

// Mock the fetch function
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Authorize API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.LAYERCODE_API_KEY = 'test-layercode-api-key';
  });

  it('should successfully authorize a session with valid request', async () => {
    const mockResponse = {
      client_session_key: 'test-session-key',
      session_id: 'test-session-id'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
      headers: new Map(),
    } as any);

    const request = new Request('http://localhost:3000/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: 'test-pipeline' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.layercode.com/v1/pipelines/authorize_session',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-layercode-api-key'
        },
        body: JSON.stringify({ pipeline_id: 'test-pipeline' })
      })
    );
  });

  it('should return error when LAYERCODE_API_KEY is not set', async () => {
    delete process.env.LAYERCODE_API_KEY;

    const request = new Request('http://localhost:3000/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: 'test-pipeline' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('LAYERCODE_API_KEY is not set.');
  });

  it('should return error when pipeline_id is missing', async () => {
    const request = new Request('http://localhost:3000/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing pipeline_id in request body.');
  });

  it('should return error when Layercode API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
      headers: new Map(),
    } as any);

    const request = new Request('http://localhost:3000/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: 'test-pipeline' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bad Request');
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const request = new Request('http://localhost:3000/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: 'test-pipeline' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Network error');
  });
}); 