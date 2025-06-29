import React, { useState, useEffect } from 'react';
import { Loading } from '@carbon/react';
import dynamic from 'next/dynamic';

// Dynamically import the core component that uses the Layercode hook
const LayercodeVoiceAgentCore = dynamic(
  () => import('./LayercodeVoiceAgentCore'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Loading description="Loading Voice AI..." withOverlay={false} />
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#6f6f6f',
          marginTop: '1rem'
        }}>
          Initializing Voice AI...
        </p>
      </div>
    )
  }
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LayercodeVoiceAgentProps {
  pipelineId: string;
  authorizeEndpoint?: string;
  onNewMessage?: (message: Message) => void;
}

export default function LayercodeVoiceAgent(props: LayercodeVoiceAgentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Loading description="Loading Voice AI..." withOverlay={false} />
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#6f6f6f',
          marginTop: '1rem'
        }}>
          Initializing...
        </p>
      </div>
    );
  }

  return <LayercodeVoiceAgentCore {...props} />;
} 