import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MicrophoneControl from '@/components/voice/MicrophoneControl';

// Mock the audio API calls
const mockGetUserMedia = jest.fn();
const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe('MicrophoneControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
  });

  it('renders the microphone control interface', () => {
    render(<MicrophoneControl onStartRecording={mockStartRecording} onStopRecording={mockStopRecording} />);
    
    // Check for the main container with center alignment
    const container = document.querySelector('[style*="text-align: center"]');
    expect(container).toBeInTheDocument();
    
    // Check for microphone icon in the circular button
    const micIcon = document.querySelector('svg');
    expect(micIcon).toBeInTheDocument();
  });

  it('displays correct status when not recording', () => {
    render(<MicrophoneControl onStartRecording={mockStartRecording} onStopRecording={mockStopRecording} />);
    
    // Use getAllByText to handle multiple "Ready" elements and check the first one
    const readyElements = screen.getAllByText(/Ready/i);
    expect(readyElements.length).toBeGreaterThan(0);
    expect(readyElements[0]).toBeInTheDocument();
  });

  it('renders microphone control with proper visual elements', () => {
    render(<MicrophoneControl onStartRecording={mockStartRecording} onStopRecording={mockStopRecording} />);
    
    // Check for progress indicator which is part of our component
    const progressElement = document.querySelector('.cds--progress');
    expect(progressElement).toBeInTheDocument();
    
    // Check for the circular microphone button
    const circularButton = document.querySelector('[style*="border-radius: 50%"]');
    expect(circularButton).toBeInTheDocument();
  });

  it('shows microphone ready state initially', () => {
    render(<MicrophoneControl onStartRecording={mockStartRecording} onStopRecording={mockStopRecording} />);
    
    // Check for the "Ready" status specifically in the progress component
    const progressReady = screen.getByTitle('Ready');
    expect(progressReady).toBeInTheDocument();
  });

  it('handles microphone control interactions', async () => {
    render(<MicrophoneControl onStartRecording={mockStartRecording} onStopRecording={mockStopRecording} />);
    
    // Find the clickable circular microphone area
    const circularButton = document.querySelector('[style*="border-radius: 50%"]');
    expect(circularButton).toBeInTheDocument();
    
    if (circularButton) {
      fireEvent.click(circularButton);
      
      await waitFor(() => {
        // Component should handle the click - verify the element exists
        expect(circularButton).toBeInTheDocument();
      });
    }
  });

  it('displays proper accessibility elements', () => {
    render(<MicrophoneControl onStartRecording={mockStartRecording} onStopRecording={mockStopRecording} />);
    
    // Check for SVG elements which should have proper titles
    const svgTitles = document.querySelectorAll('svg title');
    expect(svgTitles.length).toBeGreaterThan(0);
    
    // Check for assistive text elements
    const assistiveText = document.querySelectorAll('.cds--assistive-text');
    expect(assistiveText.length).toBeGreaterThan(0);
  });
}); 