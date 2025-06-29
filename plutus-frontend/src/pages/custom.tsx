import React, { useState, useEffect } from 'react';
import { Loading, Theme } from '@carbon/react';
import { useAuth, LoginPage } from '../components/auth';
import dynamic from 'next/dynamic';

// Dynamically import CustomVoiceAgent with SSR disabled
const CustomVoiceAgent = dynamic(
  () => import('../components/voice').then(mod => ({ default: mod.CustomVoiceAgent })),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: '#6f6f6f' 
      }}>
        🔧 Loading Custom Pipeline...
      </div>
    )
  }
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export default function CustomPage() {
  const { user, isLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  // Explicit client-side authentication check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAuth = localStorage.getItem('plutus-auth');
      const storedUser = localStorage.getItem('plutus-user');
      
      console.log('🔐 Custom page auth check:', {
        storedAuth,
        storedUser: storedUser ? JSON.parse(storedUser) : null,
        contextUser: user,
        contextLoading: isLoading
      });
      
      if (!isLoading) {
        setAuthChecked(true);
      }
    }
  }, [user, isLoading]);

  // EXPLICIT AUTHENTICATION BARRIER
  const isAuthenticated = user?.isAuthenticated === true;
  const hasValidAuth = typeof window !== 'undefined' && 
                      localStorage.getItem('plutus-auth') === 'true' && 
                      localStorage.getItem('plutus-user');

  // Show loading while checking authentication status
  if (isLoading || !authChecked) {
    return (
      <Theme theme="white">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f4f4f4'
        }}>
          <Loading description="Loading Custom Voice Agent..." withOverlay={false} />
        </div>
      </Theme>
    );
  }

  // STRICT AUTHENTICATION CHECK
  if (!isAuthenticated || !hasValidAuth || !user) {
    return <LoginPage />;
  }

  const handleCustomMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  return (
    <Theme theme="white">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f4f4f4',
        padding: '2rem'
      }}>
        <CustomVoiceAgent 
          transcribeEndpoint="/api/transcribe"
          onNewMessage={handleCustomMessage}
        />
      </div>
    </Theme>
  );
} 