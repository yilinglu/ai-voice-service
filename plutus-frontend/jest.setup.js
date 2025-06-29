// Mock environment variables for testing
process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID = 'test-pipeline-id';
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';

// Mock scrollIntoView which isn't available in jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock Web Audio API for voice components
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createAnalyser: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
    })),
    createMediaStreamSource: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    resume: jest.fn(() => Promise.resolve()),
    suspend: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    state: 'running',
  })),
});

// Mock getUserMedia for microphone tests
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() =>
      Promise.resolve({
        getTracks: () => [
          {
            stop: jest.fn(),
            kind: 'audio',
            enabled: true,
          },
        ],
        getAudioTracks: () => [
          {
            stop: jest.fn(),
            kind: 'audio',
            enabled: true,
          },
        ],
      })
    ),
  },
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}; 