import { GET } from '../app/api/health/route';

describe('Health API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status with correct data structure', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('service', 'plutus-layercode-backend');
    expect(typeof data.timestamp).toBe('string');
    expect(new Date(data.timestamp).getTime()).not.toBeNaN(); // Valid ISO date
  });

  it('should return valid JSON response', async () => {
    const response = await GET();
    
    expect(response.headers.get('Content-Type')).toContain('application/json');
  });

  it('should have correct response structure', async () => {
    const response = await GET();
    const data = await response.json();

    const expectedKeys = ['status', 'timestamp', 'service'];
    expectedKeys.forEach(key => {
      expect(data).toHaveProperty(key);
    });
  });
}); 