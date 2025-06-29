import React, { useEffect, useState, useRef } from 'react';
import { Microphone } from '@carbon/icons-react';

interface MicrophoneControlProps {
  isActive: boolean;
  onToggle: () => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  compact?: boolean; // Use compact mode with fixed heights
  diameter?: string; // Responsive diameter (e.g., '3.5rem', '2.5rem')
  visualOnly?: boolean; // If true, only shows visual state without accessing real microphone
}

export default function MicrophoneControl({ 
  isActive, 
  onToggle, 
  onStreamChange,
  compact = false,
  diameter = '3.75rem', // Default responsive size (equivalent to 60px at 16px base font)
  visualOnly = false
}: MicrophoneControlProps) {
  const [microphoneState, setMicrophoneState] = useState<'initial' | 'listening' | 'muted'>('initial');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);

  // Real audio capture
  const startAudioCapture = async () => {
    try {
      console.log('🎙️ Starting real audio capture...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      setMicrophoneState('listening');
      setError(null);
      
      // Notify parent component about stream change
      if (onStreamChange) {
        onStreamChange(stream);
      }
      
      console.log('✅ Audio capture started successfully');
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      setMicrophoneState('muted');
      setHasPermission(false);
      setError('Microphone access denied. Please enable microphone permissions.');
      
      if (onStreamChange) {
        onStreamChange(null);
      }
    }
  };

  const stopAudioCapture = () => {
    console.log('🛑 Stopping audio capture...');
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Notify parent component about stream change
    if (onStreamChange) {
      onStreamChange(null);
    }
    
    setMicrophoneState('muted');
  };

  // Check hardware on component mount
  useEffect(() => {
    const checkMicrophoneHardware = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          console.log('🎙️ Microphone hardware detected');
          setMicrophoneState('initial');
        } else {
          console.error('❌ No microphone support');
          setHasPermission(false);
          setError('Microphone not supported on this device');
        }
      } catch (error) {
        console.error('❌ Error checking microphone hardware:', error);
        setError('Error checking microphone hardware');
      }
    };
    
    checkMicrophoneHardware();
  }, []);

  // Handle microphone toggle
  useEffect(() => {
    if (isActive) {
      startAudioCapture();
    } else {
      stopAudioCapture();
    }
    
    // Cleanup on unmount
    return () => {
      stopAudioCapture();
    };
  }, [isActive]);

  const getMicrophoneColor = () => {
    switch (microphoneState) {
      case 'listening':
        return '#198038'; // Green - actively listening
      case 'muted':
        return '#8D8D8D'; // Grey - muted
      case 'initial':
      default:
        return '#8D8D8D'; // Grey - ready/initial
    }
  };

  const getMicrophoneText = () => {
    if (hasPermission === false) {
      return 'Permission Denied';
    }
    
    switch (microphoneState) {
      case 'listening':
        return 'Listening';
      case 'muted':
        return 'Muted';
      case 'initial':
      default:
        return 'Ready';
    }
  };

  const shouldShowSlash = () => {
    return microphoneState === 'muted';
  };

  return (
    <div style={{ 
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Microphone Button */}
      <div 
        style={{ 
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: getMicrophoneColor(),
          color: 'white',
          marginBottom: '1rem',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onClick={onToggle}
        title={`Click to ${isActive ? 'mute' : 'unmute'} microphone`}
      >
        <Microphone size={24} />
        
        {/* Diagonal slash for muted state */}
        {shouldShowSlash() && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              width: '3px',
              height: '45px',
              backgroundColor: '#ffffff',
              borderRadius: '2px',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      {/* Status Text */}
      <div style={{ 
        marginBottom: '1rem',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ 
          fontSize: '0.875rem', 
          color: getMicrophoneColor(),
          fontWeight: 500,
          margin: 0
        }}>
          {getMicrophoneText()}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: '0.5rem',
          backgroundColor: '#fff1f1',
          border: '1px solid #DA1E28',
          borderRadius: '4px',
          maxWidth: '300px'
        }}>
          <p style={{ fontSize: '0.75rem', color: '#DA1E28', margin: 0 }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
} 