import React from 'react';
import SyntheticWaveformControl from './SyntheticWaveformControl';
import { type SyntheticPattern } from './syntheticWaveformUtils';

interface LayercodeAgentWaveformControlProps {
  agentAudioAmplitude: number;  // 0-1 from Layercode
  status: string;               // Connection status
  barCount?: number;
  barHeight?: string;
  barWidth?: string;
  syntheticPattern?: SyntheticPattern;
  staticPattern?: 'flat' | 'noise' | 'wave' | 'center';
  animationSpeed?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * LayercodeAgentWaveformControl - AI Agent Voice Visualization
 * 
 * Wrapper component that visualizes AI agent speech using synthetic waveforms.
 * Driven by agentAudioAmplitude from useLayercodePipeline hook.
 * 
 * Uses frequency-distributed pattern by default to simulate realistic audio analysis.
 */
export default function LayercodeAgentWaveformControl({
  agentAudioAmplitude,
  status,
  barCount = 10,
  barHeight = '2.5rem',
  barWidth = '0.6rem', 
  syntheticPattern = 'frequency-distributed', // Default: most realistic pattern
  staticPattern = 'wave',
  animationSpeed = 50,
  showLabel = true,
  className = ''
}: LayercodeAgentWaveformControlProps) {
  
  const isConnected = status === 'connected';
  const hasAudioSignal = agentAudioAmplitude > 0.05; // Threshold for meaningful audio
  
  // Debug logging (reduced frequency)
  React.useEffect(() => {
    console.log('🤖 LayercodeAgentWaveformControl Debug:', {
      status,
      isConnected,
      agentAudioAmplitude: agentAudioAmplitude.toFixed(3),
      hasAudioSignal,
      isActivePassedToWaveform: isConnected && hasAudioSignal, // ← Fixed logic preview
      staticPattern
    });
  }, [status, isConnected, hasAudioSignal, staticPattern]); // Reduced logging frequency

  return (
    <div className={`layercode-agent-waveform ${className}`}>
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
            🤖 AI Agent Voice
          </h4>
          {isConnected && hasAudioSignal && (
            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.75rem',
              color: '#198038',
              fontStyle: 'italic'
            }}>
              Speaking... ({(agentAudioAmplitude * 100).toFixed(0)}%)
            </p>
          )}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.75rem',
        backgroundColor: hasAudioSignal ? '#e8f5e8' : '#f8f9fa',
        borderRadius: '0.75rem',
        border: `1px solid ${hasAudioSignal ? '#198038' : '#e0e0e0'}`,
        transition: 'all 0.3s ease'
      }}>
        <SyntheticWaveformControl
          isActive={isConnected && hasAudioSignal}
          amplitude={agentAudioAmplitude}
          barCount={barCount}
          barHeight={barHeight}
          barWidth={barWidth}
          syntheticPattern={syntheticPattern}
          staticPattern={staticPattern}
          animationSpeed={animationSpeed}
        />
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          Status: {status} | Amplitude: {agentAudioAmplitude.toFixed(3)} | Pattern: {syntheticPattern}
        </div>
      )}
    </div>
  );
} 