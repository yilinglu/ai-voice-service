import React, { useState, useEffect } from 'react';
import { 
  Header, 
  HeaderName,
  HeaderGlobalBar,
  Content,
  Grid,
  Column,
  Stack,
  Loading,
  Theme,
  InlineNotification,
  Link
} from '@carbon/react';
import { useAuth, LoginPage, UserProfile } from '../components/auth';
import ChatInterface from '../components/chat/ChatInterface';
import dynamic from 'next/dynamic';

// Dynamically import AiHumanVoiceControl with SSR disabled
const AiHumanVoiceControl = dynamic(
  () => import('../components/voice').then(mod => ({ default: mod.AiHumanVoiceControl })),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        textAlign: 'center', 
        padding: '3rem 2rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        margin: '0 auto',
        maxWidth: '600px',
        border: '1px solid #e0e0e0'
      }}>
        <Loading withOverlay={false} />
        <p style={{ 
          fontSize: '1rem', 
          color: '#6f6f6f',
          marginTop: '1rem'
        }}>
          🎙️ Loading AI Voice Interface...
        </p>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#6f6f6f',
          marginTop: '0.5rem',
          fontStyle: 'italic'
        }}>
          Initializing synthetic waveforms...
        </p>
      </div>
    )
  }
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  pipeline?: 'layercode' | 'custom' | 'text';
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  // Explicit client-side authentication check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAuth = localStorage.getItem('plutus-auth');
      const storedUser = localStorage.getItem('plutus-user');
      
      console.log('🔐 Explicit auth check:', {
        storedAuth,
        storedUser: storedUser ? JSON.parse(storedUser) : null,
        contextUser: user,
        contextLoading: isLoading
      });
      
      // Only mark as checked after we've verified no authentication
      if (!isLoading) {
        setAuthChecked(true);
      }
    }
  }, [user, isLoading]);

  // Debug logging
  useEffect(() => {
    console.log('🏠 Home page - Auth Debug:', {
      isLoading,
      user: user ? { 
        id: user.id, 
        username: user.username, 
        isAuthenticated: user.isAuthenticated,
        role: user.role 
      } : null,
      userExists: !!user,
      isAuthenticated: user?.isAuthenticated,
      shouldShowLogin: !user?.isAuthenticated,
      authChecked
    });
  }, [user, isLoading, authChecked]);

  console.log('🔍 Rendering Home page with:', { 
    isLoading, 
    userAuthenticated: user?.isAuthenticated,
    hasUser: !!user,
    authChecked
  });

  // EXPLICIT AUTHENTICATION BARRIER
  const isAuthenticated = user?.isAuthenticated === true;
  const hasValidAuth = typeof window !== 'undefined' && 
                      localStorage.getItem('plutus-auth') === 'true' && 
                      localStorage.getItem('plutus-user');

  // Show loading while checking authentication status
  if (isLoading || !authChecked) {
    console.log('📱 Showing loading screen - isLoading:', isLoading, 'authChecked:', authChecked);
    return (
      <Theme theme="white">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f4f4f4'
        }}>
          <Loading description="Loading Plutus..." withOverlay={false} />
        </div>
      </Theme>
    );
  }

  // STRICT AUTHENTICATION CHECK
  if (!isAuthenticated || !hasValidAuth || !user) {
    console.log('🔐 BLOCKING ACCESS - Not authenticated:', { 
      isAuthenticated, 
      hasValidAuth, 
      hasUser: !!user 
    });
    
    return <LoginPage />;
  }

  console.log('✅ GRANTING ACCESS - User authenticated');

  // Debug environment variable loading
  console.log('🔍 Environment variable debug:', {
    NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID,
    NODE_ENV: process.env.NODE_ENV,
    allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
  });

  const pipelineId = process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID || 'g0yw0o69';
  console.log('🎯 Pipeline ID being used:', pipelineId);

  const handleLayercodeMessage = (message: Omit<Message, 'pipeline'>) => {
    const newMessage: Message = { ...message, pipeline: 'layercode' };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTextMessage = (message: Omit<Message, 'pipeline'>) => {
    const newMessage: Message = { ...message, pipeline: 'text' };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <Theme theme="white">
      <Header aria-label="Plutus Voice Agent">
        <HeaderName href="#" prefix="Plutus">
          Voice Agent
        </HeaderName>
        <HeaderGlobalBar>
          <UserProfile compact />
        </HeaderGlobalBar>
      </Header>

      <Content>
        <Grid fullWidth style={{ padding: '2rem 0' }}>
          <Column lg={16} md={8} sm={4}>
            <Stack gap={7}>
              {/* Main Voice AI Section */}
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  margin: '0 0 0.5rem 0',
                  color: '#0f62fe'
                }}>
                  Voice Agent
                </h2>
                <p style={{ color: '#6f6f6f', margin: 0 }}>
                  Professional voice AI technology • Ultra-low latency conversations
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '2rem',
                margin: '0 auto 2rem auto',
                maxWidth: '600px',
                border: '1px solid #e0e0e0'
              }}>
                <AiHumanVoiceControl 
                  pipelineId={pipelineId}
                  authorizeEndpoint="/api/authorize"
                  layout="vertical"
                  syntheticPattern="frequency-distributed"
                  showLabels={true}
                  showStatus={true}
                  onConversationUpdate={(metadata) => {
                    // Handle conversation updates
                    if (metadata.humanSpeechText) {
                      handleLayercodeMessage({
                        role: 'user',
                        content: metadata.humanSpeechText,
                        timestamp: metadata.humanSpeechTimestamp
                      });
                    }
                    if (metadata.agentResponseText) {
                      handleLayercodeMessage({
                        role: 'assistant',
                        content: metadata.agentResponseText,
                        timestamp: metadata.agentResponseTimestamp
                      });
                    }
                  }}
                  enableDebug={process.env.NODE_ENV === 'development'}
                />
              </div>

              {/* Chat Interface */}
              <ChatInterface 
                messages={messages.map(msg => ({
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp
                }))} 
                onNewMessage={handleTextMessage}
              />
            </Stack>
          </Column>
        </Grid>
      </Content>
    </Theme>
  );
} 