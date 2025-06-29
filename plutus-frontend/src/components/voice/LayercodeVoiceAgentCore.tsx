import React, { useState, useCallback } from 'react';
import { useLayercodePipeline } from '@layercode/react-sdk';
import { Grid, Column, Stack, Loading } from '@carbon/react';
import { Microphone, MicrophoneOff } from '@carbon/icons-react';
import ClassicAudioVisualizer from './ClassicAudioVisualizer';
import AmplitudeVisualizer from './AmplitudeVisualizer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LayercodeVoiceAgentCoreProps {
  pipelineId: string;
  authorizeEndpoint?: string;
  onNewMessage?: (message: Message) => void;
}

export default function LayercodeVoiceAgentCore({ 
  pipelineId, 
  authorizeEndpoint = '/api/authorize',
  onNewMessage
}: LayercodeVoiceAgentCoreProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Always call the Layercode hook (no conditional calls)
  const {
    status,
    userAudioAmplitude,
    agentAudioAmplitude,
  } = useLayercodePipeline({
    pipelineId,
    authorizeSessionEndpoint: authorizeEndpoint,
    onConnect: ({ sessionId }) => {
      console.log('🔗 Connected to Layercode pipeline:', sessionId);
      setAuthError(null);
      setRetryCount(0);
      addMessage('assistant', 'Hi! I\'m ready to chat. How can I help you today?');
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from Layercode pipeline');
    },
    onError: (error) => {
      console.error('❌ Layercode error:', error);
      setAuthError(error?.message || 'Connection failed');
      
      // Auto-retry logic for authorization errors
      if (error?.message?.includes('Failed to authorize') && retryCount < 3) {
        console.log(`🔄 Retrying authorization attempt ${retryCount + 1}/3...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        addMessage('assistant', 'I\'m experiencing some technical difficulties. Please try again.');
      }
    },
    onDataMessage: (data) => {
      console.log('📨 Received data from Layercode:', data);
      // Handle any custom data messages from your backend
    },
  });

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      role,
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    onNewMessage?.(message);
  }, [onNewMessage]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#198038'; // Green
      case 'connecting':
        return '#0F62FE'; // Blue
      case 'error':
        return '#DA1E28'; // Red
      default:
        return '#8D8D8D'; // Gray
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected & Ready';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Initializing...';
    }
  };

  const getMicrophoneIcon = () => {
    if (status === 'connected') {
      return <Microphone size={24} />;
    }
    return <MicrophoneOff size={24} />;
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Microphone Status Indicator */}
      <div style={{ marginBottom: '2rem' }}>
        <div 
          style={{ 
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            color: 'white',
            marginBottom: '1rem',
            transition: 'all 0.3s ease',
            boxShadow: status === 'connected' ? '0 0 20px rgba(25, 128, 56, 0.3)' : 'none'
          }}
        >
          {status === 'connecting' ? (
            <Loading small={true} withOverlay={false} />
          ) : (
            getMicrophoneIcon()
          )}
        </div>

        {/* Status Text */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ 
            fontSize: '1rem', 
            color: getStatusColor(),
            fontWeight: 500,
            margin: 0
          }}>
            {getStatusText()}
          </p>
          {status === 'connected' && (
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6f6f6f',
              margin: '0.5rem 0 0 0',
              fontStyle: 'italic'
            }}>
              Speak naturally - I'm listening!
            </p>
          )}
          {authError && (
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#DA1E28',
              margin: '0.5rem 0 0 0',
              fontStyle: 'italic'
            }}>
              {retryCount > 0 ? `Retrying connection... (${retryCount}/3)` : 'Connection issue - retrying...'}
            </p>
          )}
        </div>
      </div>

      {/* Real-time Audio Levels */}
      {status === 'connected' && (
        <Grid style={{ marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
          <Column sm={4} md={4} lg={8}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#6f6f6f', margin: '0 0 0.5rem 0' }}>
                Your Voice Level
              </h4>
              <div style={{
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                borderRadius: '8px',
                padding: '0 1rem'
              }}>
                <AmplitudeVisualizer 
                  amplitude={userAudioAmplitude} 
                  color="#0F62FE"
                  height={46}
                  width={250}
                />
              </div>
            </div>
          </Column>
          
          <Column sm={4} md={4} lg={8}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#6f6f6f', margin: '0 0 0.5rem 0' }}>
                AI Response Level
              </h4>
              <div style={{
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                borderRadius: '8px',
                padding: '0 1rem'
              }}>
                <AmplitudeVisualizer 
                  amplitude={agentAudioAmplitude} 
                  color="#198038"
                  height={46}
                  width={250}
                />
              </div>
            </div>
          </Column>
        </Grid>
      )}

      {/* Main MIDI Piano Roll Visualizer */}
      {status === 'connected' && (
        <div style={{ marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          <h3 style={{ 
            textAlign: 'center', 
            fontSize: '1rem', 
            color: '#262626', 
            marginBottom: '1rem',
            fontWeight: 500
          }}>
            🎹 Voice Pattern Analysis
          </h3>
          <ClassicAudioVisualizer isActive={status === 'connected'} />
        </div>
      )}

      {/* Conversation History */}
      {messages.length > 0 && (
        <div style={{ marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          <h3 style={{ 
            fontSize: '1rem', 
            color: '#262626', 
            marginBottom: '1rem',
            fontWeight: 500
          }}>
            💬 Conversation
          </h3>
          <div style={{ 
            textAlign: 'left',
            backgroundColor: '#f4f4f4',
            borderRadius: '8px',
            padding: '1rem',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {messages.slice(-10).map((message, index) => (
              <div key={index} style={{ 
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: message.role === 'user' ? '#e8f3ff' : '#e8f8e8',
                borderRadius: '6px',
                borderLeft: `4px solid ${message.role === 'user' ? '#0F62FE' : '#198038'}`
              }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6f6f6f', 
                  marginBottom: '0.25rem',
                  fontWeight: 600
                }}>
                  {message.role === 'user' ? '👤 You' : '🤖 AI'} • {message.timestamp.toLocaleTimeString()}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#262626' }}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Transcription */}
      {currentTranscription && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          maxWidth: '600px',
          margin: '0 auto 1rem auto'
        }}>
          <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0', color: '#856404' }}>
            🎙️ Listening...
          </h4>
          <p style={{ fontSize: '0.875rem', margin: 0, color: '#856404' }}>
            {currentTranscription}
          </p>
        </div>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginTop: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.75rem',
          color: '#6c757d'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>🔧 Debug Info</h4>
          <p>Status: {status}</p>
          <p>User Audio: {userAudioAmplitude.toFixed(3)}</p>
          <p>Agent Audio: {agentAudioAmplitude.toFixed(3)}</p>
          <p>Messages: {messages.length}</p>
          <p>Pipeline ID: {pipelineId}</p>
        </div>
      )}
    </div>
  );
} 