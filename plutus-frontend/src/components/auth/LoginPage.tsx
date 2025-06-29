import React, { useState } from 'react';
import {
  Grid,
  Column,
  Button,
  ButtonSet,
  Stack,
  Content,
  Theme
} from '@carbon/react';
import { Development, Security } from '@carbon/icons-react';
import DevLoginForm from './DevLoginForm';
import Auth0LoginButton from './Auth0LoginButton';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'dev' | 'auth0'>('dev');

  const handleLoginSuccess = () => {
    onLoginSuccess?.();
  };

  return (
    <Theme theme="white">
      <Content style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem 1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <Stack gap={7}>
              {/* Header */}
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ 
                  fontSize: '2rem', 
                  fontWeight: '600', 
                  margin: '0 0 0.5rem 0',
                  color: '#161616'
                }}>
                  Welcome to Plutus
                </h1>
                <p style={{ 
                  fontSize: '1rem', 
                  color: '#6f6f6f', 
                  margin: 0
                }}>
                  Your intelligent voice conversation assistant
                </p>
              </div>

              {/* Login Method Toggle */}
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  margin: '0 0 1rem 0',
                  color: '#161616'
                }}>
                  Choose Login Method:
                </p>
                <ButtonSet>
                  <Button
                    kind={activeTab === 'dev' ? 'primary' : 'secondary'}
                    size="lg"
                    renderIcon={Development}
                    onClick={() => setActiveTab('dev')}
                  >
                    Development
                  </Button>
                  <Button
                    kind={activeTab === 'auth0' ? 'primary' : 'secondary'}
                    size="lg"
                    renderIcon={Security}
                    onClick={() => setActiveTab('auth0')}
                  >
                    Enterprise
                  </Button>
                </ButtonSet>
              </div>

              {/* Login Content */}
              <div style={{ marginTop: '1rem' }}>
                {activeTab === 'dev' && (
                  <DevLoginForm onSuccess={handleLoginSuccess} />
                )}
                {activeTab === 'auth0' && (
                  <Auth0LoginButton onSuccess={handleLoginSuccess} />
                )}
              </div>

              {/* Footer */}
              <div style={{ 
                textAlign: 'center', 
                borderTop: '1px solid #e0e0e0',
                paddingTop: '1.5rem'
              }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6f6f6f', 
                  margin: 0 
                }}>
                  Experience AI conversations with ultra-low latency voice interaction
                </p>
              </div>
            </Stack>
          </div>
        </div>
      </Content>
    </Theme>
  );
};

export default LoginPage; 