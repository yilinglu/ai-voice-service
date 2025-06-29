import React from 'react';
import {
  Button,
  Tile,
  Stack,
  InlineNotification
} from '@carbon/react';
import { Login, Security } from '@carbon/icons-react';
import { useAuth } from './AuthContext';

interface Auth0LoginButtonProps {
  onSuccess?: () => void;
}

const Auth0LoginButton: React.FC<Auth0LoginButtonProps> = ({ onSuccess }) => {
  const { loginWithAuth0, isLoading } = useAuth();

  const handleAuth0Login = async () => {
    try {
      await loginWithAuth0();
      onSuccess?.();
    } catch (error) {
      console.error('Auth0 login error:', error);
    }
  };

  return (
    <Tile>
      <Stack gap={6}>
        <div>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
            Enterprise Login
          </h3>
          <p style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>
            Secure single sign-on with Auth0
          </p>
        </div>

        <Button
          kind="primary"
          size="lg"
          onClick={handleAuth0Login}
          disabled={isLoading}
          renderIcon={Security}
          style={{ width: '100%' }}
        >
          {isLoading ? 'Connecting...' : 'Continue with Auth0'}
        </Button>

        <InlineNotification
          kind="info"
          title="Coming Soon"
          subtitle="Auth0 integration will be available in the next development phase. Please use development login for now."
          lowContrast
          hideCloseButton
        />

        {/* Features preview */}
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f4f4f4', 
          borderRadius: '0.25rem',
          border: '1px solid #e0e0e0'
        }}>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#6f6f6f', 
            margin: '0 0 0.5rem 0',
            fontWeight: '600'
          }}>
            🚀 Auth0 Features (Coming Soon):
          </p>
          <ul style={{ 
            fontSize: '0.75rem', 
            color: '#6f6f6f', 
            margin: 0,
            paddingLeft: '1rem'
          }}>
            <li>Single Sign-On (SSO)</li>
            <li>Multi-factor Authentication (MFA)</li>
            <li>Social login providers</li>
            <li>Enterprise directory integration</li>
            <li>Session management</li>
          </ul>
        </div>
      </Stack>
    </Tile>
  );
};

export default Auth0LoginButton; 