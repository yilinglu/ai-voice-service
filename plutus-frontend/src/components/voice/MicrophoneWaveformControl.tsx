import React, { useState, useRef } from 'react';
import { Stack } from '@carbon/react';
import MicrophoneControl from './MicrophoneControl';
import WaveformControl from './WaveformControl';

interface MicrophoneWaveformControlProps {
  onStateChange?: (isListening: boolean) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  staticPattern?: 'flat' | 'noise' | 'wave' | 'center';
  showBorder?: boolean;
  backgroundColor?: string;
  borderRadius?: string;
  minHeight?: string;
}

/**
 * MicrophoneWaveformControl - Combined microphone and waveform widget
 * 
 * Finite State Machine:
 * 1. Listening: Microphone active (green), Waveform responds to real-time audio
 * 2. Mute: Microphone grey with slash, Waveform shows static pattern
 * 
 * Default state: Listening (state 1)
 * Click microphone: Toggle between Listening ↔ Mute
 */
export default function MicrophoneWaveformControl({ 
  onStateChange,
  onStreamChange,
  staticPattern = 'wave',
  showBorder = false,
  backgroundColor = 'transparent',
  borderRadius = '8px',
  minHeight = '120px'
}: MicrophoneWaveformControlProps) {
  const [isListening, setIsListening] = useState(true);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  
  const handleToggle = () => {
    const newState = !isListening;
    setIsListening(newState);
    onStateChange?.(newState);
  };

  const handleStreamChange = (stream: MediaStream | null) => {
    setCurrentStream(stream);
    onStreamChange?.(stream);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      minHeight,
      border: showBorder ? '1px solid #e0e0e0' : 'none',
      borderRadius: showBorder ? borderRadius : 'none',
      backgroundColor,
      padding: '1rem'
    }}>
      <Stack gap={4} orientation="horizontal" style={{ 
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Microphone Control */}
        <MicrophoneControl
          isActive={isListening}
          onToggle={handleToggle}
          onStreamChange={handleStreamChange}
        />
        
        {/* Waveform Visualization */}
        <WaveformControl
          isActive={isListening}
          audioStream={currentStream}
          staticPattern={staticPattern}
        />
      </Stack>
    </div>
  );
} 