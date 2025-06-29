import React, { useState, useRef, useEffect } from 'react';
import { Stack, Tag } from '@carbon/react';
import { MicrophoneWaveformControl } from './index';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface CustomVoiceAgentProps {
  transcribeEndpoint: string;
  onNewMessage: (message: Message) => void;
}

type MicrophoneState = 'idle' | 'listening' | 'processing';

export default function CustomVoiceAgent({ 
  transcribeEndpoint, 
  onNewMessage 
}: CustomVoiceAgentProps) {
  const [micState, setMicState] = useState<MicrophoneState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleStateChange = (isListening: boolean) => {
    setMicState(isListening ? 'listening' : 'idle');
  };

  const handleStreamChange = (stream: MediaStream | null) => {
    // Handle stream changes if needed
    console.log('Stream changed:', stream);
  };

  const status = {
    text: 'Processing',
    kind: 'blue'
  } as const;

  // Only show status when processing (not when idle or listening)
  const showStatus = micState === 'processing';

  return (
    <Stack gap={6}>
      {/* Connection Status - only show when active */}
      {showStatus && (
        <div style={{ textAlign: 'center' }}>
          <Tag type={status.kind}>
            {status.text}
          </Tag>
          {error && (
            <p style={{ color: '#da1e28', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Microphone and Waveform Widget */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <MicrophoneWaveformControl
          onStateChange={handleStateChange}
          onStreamChange={handleStreamChange}
        />
      </div>
    </Stack>
  );
} 