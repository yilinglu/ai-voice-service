import React from 'react';
import MicrophoneControl from './MicrophoneControl';
import SyntheticWaveformControl from './SyntheticWaveformControl';
import { type SyntheticPattern } from './syntheticWaveformUtils';

interface LayercodeHumanWaveformControlProps {
  userAudioAmplitude: number;   // 0-1 from Layercode
  status: string;               // Connection status
  onMicrophoneToggle?: () => void; // Manual toggle callback (if supported)
  isListening?: boolean;        // Override listening state
  microphoneDiameter?: string;  // Responsive microphone size
  barCount?: number;
  barHeight?: string;
  barWidth?: string;
  syntheticPattern?: SyntheticPattern;
  staticPattern?: 'flat' | 'noise' | 'wave' | 'center';
  animationSpeed?: number;
  layout?: 'horizontal' | 'vertical';
  spacing?: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * LayercodeHumanWaveformControl - Human Voice Visualization with Microphone Control
 * 
 * Combines responsive MicrophoneControl with synthetic waveform visualization.
 * Uses userAudioAmplitude from useLayercodePipeline hook for real-time visualization.
 * 
 * Note: Microphone is managed by Layercode SDK, so manual toggle may not work.
 * The isListening state should reflect the actual SDK state.
 */
export default function LayercodeHumanWaveformControl({
  userAudioAmplitude,
  status,
  onMicrophoneToggle,
  isListening = false,
  microphoneDiameter = '3.5rem',
  barCount = 10,
  barHeight = '3rem',
  barWidth = '0.8rem',
  syntheticPattern = 'frequency-distributed', // Default: most realistic pattern
  staticPattern = 'wave',
  animationSpeed = 50,
  layout = 'horizontal',
  spacing = '1rem',
  showLabel = true,
  className = ''
}: LayercodeHumanWaveformControlProps) {
  
  const isConnected = status === 'connected';
  const hasAudioSignal = userAudioAmplitude > 0.05; // Threshold for meaningful audio
  
  // Debug logging (reduced frequency)
  React.useEffect(() => {
    console.log('🎤 LayercodeHumanWaveformControl Debug:', {
      status,
      isConnected,
      isListening,
      userAudioAmplitude: userAudioAmplitude.toFixed(3),
      hasAudioSignal,
      isActivePassedToWaveform: isConnected && hasAudioSignal, // ← Fixed logic preview
      staticPattern
    });
  }, [status, isConnected, isListening, hasAudioSignal, staticPattern]); // Removed userAudioAmplitude to reduce spam

  const containerStyle = {
    display: 'inline-flex',
    flexDirection: layout === 'horizontal' ? 'row' as const : 'column' as const,
    alignItems: 'center',
    gap: spacing,
    flexShrink: 0
  };

  return (
    <div className={`layercode-human-waveform ${className}`}>
      {showLabel && (
        <div style={{
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: '#6f6f6f',
            fontWeight: '500'
          }}>
            🎤 Your Voice
          </h4>
          {isConnected && hasAudioSignal && (
            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.75rem',
              color: '#0F62FE',
              fontStyle: 'italic'
            }}>
              Speaking... ({(userAudioAmplitude * 100).toFixed(0)}%)
            </p>
          )}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.75rem',
        backgroundColor: hasAudioSignal ? '#e8f3ff' : '#f8f9fa',
        borderRadius: '0.75rem',
        border: `1px solid ${hasAudioSignal ? '#0F62FE' : '#e0e0e0'}`,
        transition: 'all 0.3s ease'
      }}>
        <div style={containerStyle}>
          {/* Microphone Control */}
          <MicrophoneControl
            isActive={isListening}
            onToggle={onMicrophoneToggle || (() => {
              console.warn('LayercodeHumanWaveformControl: Manual microphone toggle not supported with Layercode SDK');
            })}
            diameter={microphoneDiameter}
            visualOnly={true} // ✅ Visual-only mode - SDK manages real microphone
          />
          
          {/* Synthetic Waveform Visualization */}
          <SyntheticWaveformControl
            isActive={isConnected && hasAudioSignal}
            amplitude={userAudioAmplitude}
            barCount={barCount}
            barHeight={barHeight}
            barWidth={barWidth}
            syntheticPattern={syntheticPattern}
            staticPattern={staticPattern}
            animationSpeed={animationSpeed}
          />
        </div>
      </div>
      
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div style={{
          marginTop: '0.5rem',
          textAlign: 'center',
          color: '#da1e28',
          fontSize: '0.75rem'
        }}>
          ⚠️ Not connected to voice service
        </div>
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          Status: {status} | Listening: {isListening ? 'Yes' : 'No'} | Amplitude: {userAudioAmplitude.toFixed(3)} | Pattern: {syntheticPattern}
        </div>
      )}
    </div>
  );
} 