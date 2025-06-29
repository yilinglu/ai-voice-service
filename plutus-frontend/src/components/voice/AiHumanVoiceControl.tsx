import React, { useEffect, useState, useCallback } from 'react';
import { useLayercodePipeline } from '@layercode/react-sdk';
import LayercodeAgentWaveformControl from './LayercodeAgentWaveformControl';
import LayercodeHumanWaveformControl from './LayercodeHumanWaveformControl';
import StatusLabelControl from './StatusLabelControl';
import { type SyntheticPattern } from './syntheticWaveformUtils';

// Interface for conversation metadata
export interface ConversationMetadata {
  humanSpeechText?: string;
  humanSpeechTimestamp?: Date;
  agentResponseText?: string;
  agentResponseTimestamp?: Date;
  conversationId?: string;
  sessionDuration?: number;
  totalExchanges?: number;
  lastActivity?: Date;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  audioLatency?: number;
  responseTime?: number;
  [key: string]: any; // Allow additional dynamic metadata
}

interface AiHumanVoiceControlProps {
  // Layercode integration
  pipelineId?: string;
  authorizeEndpoint?: string;
  
  // Layout configuration
  layout?: 'vertical' | 'horizontal';
  spacing?: string;
  
  // Component sizing (responsive with rem)
  microphoneDiameter?: string;
  humanBarCount?: number;
  humanBarHeight?: string;
  humanBarWidth?: string;
  agentBarCount?: number;
  agentBarHeight?: string;
  agentBarWidth?: string;
  
  // Visual patterns
  syntheticPattern?: SyntheticPattern;
  staticPattern?: 'flat' | 'noise' | 'wave' | 'center';
  animationSpeed?: number;
  
  // UI options
  showLabels?: boolean;
  showStatus?: boolean;
  compactStatus?: boolean;
  
  // Event callbacks
  onConversationUpdate?: (metadata: ConversationMetadata) => void;
  onStatusChange?: (status: string) => void;
  onSpeechDetected?: (type: 'human' | 'agent', amplitude: number) => void;
  
  // Debug and development
  enableDebug?: boolean;
  className?: string;
}

/**
 * AiHumanVoiceControl - Complete AI-Human Voice Interaction System
 * 
 * This is the main component that orchestrates the entire voice interaction experience:
 * - Integrates with Layercode voice pipeline 
 * - Visualizes both human and AI agent voices using synthetic waveforms
 * - Provides comprehensive conversation metadata and analytics
 * - Maintains responsive design with rem-based sizing
 * - Offers flexible layout options (vertical/horizontal)
 * 
 * Data Flow:
 * useLayercodePipeline → { status, userAudioAmplitude, agentAudioAmplitude }
 * ↓
 * AiHumanVoiceControl → distributes data to sub-components
 * ↓
 * StatusLabelControl + LayercodeHumanWaveformControl + LayercodeAgentWaveformControl
 */
export default function AiHumanVoiceControl({
  pipelineId = process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID || '',
  authorizeEndpoint = '/api/authorize',
  layout = 'vertical',
  spacing = '1.5rem',
  microphoneDiameter = '3.5rem',
  humanBarCount = 10,
  humanBarHeight = '3rem',
  humanBarWidth = '0.8rem',
  agentBarCount = 10,
  agentBarHeight = '2.5rem',
  agentBarWidth = '0.6rem',
  syntheticPattern = 'frequency-distributed', // Default: most realistic
  staticPattern = 'wave',
  animationSpeed = 50,
  showLabels = true,
  showStatus = true,
  compactStatus = false,
  onConversationUpdate,
  onStatusChange,
  onSpeechDetected,
  enableDebug = false,
  className = ''
}: AiHumanVoiceControlProps) {
  
  // Conversation state and metadata
  const [conversationMetadata, setConversationMetadata] = useState<ConversationMetadata>({
    totalExchanges: 0,
    sessionDuration: 0,
    lastActivity: new Date()
  });
  
  const [sessionStartTime] = useState<Date>(new Date());
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentResponse, setCurrentResponse] = useState<string>('');

  // Memoize callbacks to prevent infinite re-renders
  const memoizedOnConversationUpdate = useCallback(onConversationUpdate || (() => {}), [onConversationUpdate]);
  const memoizedOnStatusChange = useCallback(onStatusChange || (() => {}), [onStatusChange]);
  const memoizedOnSpeechDetected = useCallback(onSpeechDetected || (() => {}), [onSpeechDetected]);

  // Direct integration with Layercode pipeline
  const {
    status,
    userAudioAmplitude,
    agentAudioAmplitude,
  } = useLayercodePipeline({
    pipelineId,
    authorizeSessionEndpoint: authorizeEndpoint,
    onConnect: useCallback(({ sessionId }) => {
      console.log('🎙️ AiHumanVoiceControl: Connected to voice pipeline:', sessionId);
      const now = new Date();
      setConversationMetadata(prev => ({
        ...prev,
        conversationId: sessionId,
        lastActivity: now,
        sessionDuration: Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
      }));
      
      memoizedOnStatusChange('connected');
    }, [sessionStartTime, memoizedOnStatusChange]),
    onDisconnect: useCallback(() => {
      console.log('🔌 AiHumanVoiceControl: Disconnected from voice pipeline');
      memoizedOnStatusChange('disconnected');
    }, [memoizedOnStatusChange]),
    onError: useCallback((error) => {
      console.error('❌ AiHumanVoiceControl: Voice connection error:', error);
      memoizedOnStatusChange('error');
    }, [memoizedOnStatusChange]),
    onDataMessage: useCallback((data) => {
      console.log('📨 AiHumanVoiceControl: Received data:', data);
      // Handle transcript and response data
      if (data.transcript) setCurrentTranscript(data.transcript);
      if (data.response) setCurrentResponse(data.response);
    }, []),
  });



  // Update conversation metadata when status or amplitudes change
  useEffect(() => {
    setConversationMetadata(prevMetadata => {
      const now = new Date();
      const newMetadata: ConversationMetadata = {
        ...prevMetadata,
        lastActivity: now,
        sessionDuration: Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
      };

      // Handle human speech
      if (currentTranscript && currentTranscript !== prevMetadata.humanSpeechText) {
        newMetadata.humanSpeechText = currentTranscript;
        newMetadata.humanSpeechTimestamp = now;
        newMetadata.totalExchanges = (prevMetadata.totalExchanges || 0) + 1;
      }

      // Handle agent response
      if (currentResponse && currentResponse !== prevMetadata.agentResponseText) {
        newMetadata.agentResponseText = currentResponse;
        newMetadata.agentResponseTimestamp = now;
        
        // Calculate response time if we have human speech timestamp
        if (prevMetadata.humanSpeechTimestamp) {
          newMetadata.responseTime = now.getTime() - prevMetadata.humanSpeechTimestamp.getTime();
        }
      }

      // Determine connection quality based on status and response time
      if (status === 'connected') {
        if (newMetadata.responseTime) {
          if (newMetadata.responseTime < 1000) newMetadata.connectionQuality = 'excellent';
          else if (newMetadata.responseTime < 2000) newMetadata.connectionQuality = 'good';
          else if (newMetadata.responseTime < 4000) newMetadata.connectionQuality = 'fair';
          else newMetadata.connectionQuality = 'poor';
        }
      }

      // Trigger callbacks with the new metadata
      setTimeout(() => {
        memoizedOnConversationUpdate(newMetadata);
      }, 0);

      return newMetadata;
    });
  }, [status, userAudioAmplitude, agentAudioAmplitude, currentTranscript, currentResponse, sessionStartTime, memoizedOnConversationUpdate]);

  // Separate effect for speech detection to avoid loops
  useEffect(() => {
    if (userAudioAmplitude > 0.05) memoizedOnSpeechDetected('human', userAudioAmplitude);
    if (agentAudioAmplitude > 0.05) memoizedOnSpeechDetected('agent', agentAudioAmplitude);
  }, [userAudioAmplitude, agentAudioAmplitude, memoizedOnSpeechDetected]);

  const containerStyle = {
    display: 'flex',
    flexDirection: layout === 'vertical' ? 'column' as const : 'row' as const,
    gap: spacing,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    backgroundColor: '#ffffff',
    borderRadius: '1rem',
    border: '1px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  };

  return (
    <div className={`ai-human-voice-control ${className}`} style={containerStyle}>
      {/* Status Display - Top position in vertical, left in horizontal */}
      {showStatus && (
        <StatusLabelControl
          status={status}
          compact={compactStatus}
          className="voice-status"
        />
      )}

      {/* Human Voice Visualization */}
      <LayercodeHumanWaveformControl
        userAudioAmplitude={userAudioAmplitude}
        status={status}
        isListening={status === 'connected'}
        microphoneDiameter={microphoneDiameter}
        barCount={humanBarCount}
        barHeight={humanBarHeight}
        barWidth={humanBarWidth}
        syntheticPattern={syntheticPattern}
        staticPattern={staticPattern}
        animationSpeed={animationSpeed}
        layout="horizontal" // Force horizontal for better integration
        showLabel={showLabels}
        className="human-voice"
      />

      {/* AI Agent Voice Visualization */}
      <LayercodeAgentWaveformControl
        agentAudioAmplitude={agentAudioAmplitude}
        status={status}
        barCount={agentBarCount}
        barHeight={agentBarHeight}
        barWidth={agentBarWidth}
        syntheticPattern={syntheticPattern}
        staticPattern={staticPattern}
        animationSpeed={animationSpeed}
        showLabel={showLabels}
        className="agent-voice"
      />

      {/* Debug Information */}
      {enableDebug && process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          color: '#6c757d',
          fontFamily: 'monospace',
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          <h5 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Debug Info:</h5>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify({
              session: {
                duration: conversationMetadata.sessionDuration,
                exchanges: conversationMetadata.totalExchanges,
                quality: conversationMetadata.connectionQuality
              },
              timing: {
                lastResponse: conversationMetadata.responseTime,
                lastActivity: conversationMetadata.lastActivity?.toLocaleTimeString()
              },
              configuration: {
                layout,
                syntheticPattern,
                microphoneDiameter,
                humanBars: humanBarCount,
                agentBars: agentBarCount
              }
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 