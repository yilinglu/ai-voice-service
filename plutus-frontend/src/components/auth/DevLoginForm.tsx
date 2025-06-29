import React, { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Form,
  InlineNotification,
  Tile,
  Stack
} from '@carbon/react';
import { Login } from '@carbon/icons-react';
import { useAuth } from './AuthContext';

interface DevLoginFormProps {
  onSuccess?: () => void;
}

const DevLoginForm: React.FC<DevLoginFormProps> = ({ onSuccess }) => {
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleInputChange = (field: 'username' | 'password') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      const success = await login(credentials);
      
      if (success) {
        onSuccess?.();
      } else {
        setError('Invalid credentials. Check the development credentials below.');
        setShowHint(true);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const fillDevCredentials = () => {
    setCredentials({
      username: 'user',
      password: '123'
    });
    setError(null);
  };

  return (
    <Tile>
      <Stack gap={6}>
        <div>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
            Development Login
          </h3>
          <p style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>
            Temporary login for development and testing
          </p>
        </div>

        <Form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <TextInput
              id="dev-username"
              labelText="Username"
              placeholder="Enter username"
              value={credentials.username}
              onChange={handleInputChange('username')}
              disabled={isLoading}
              size="lg"
            />

            <PasswordInput
              id="dev-password"
              labelText="Password"
              placeholder="Enter password"
              value={credentials.password}
              onChange={handleInputChange('password')}
              disabled={isLoading}
              size="lg"
            />

            {error && (
              <InlineNotification
                kind="error"
                title="Login Failed"
                subtitle={error}
                lowContrast
                hideCloseButton
              />
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !credentials.username || !credentials.password}
              renderIcon={Login}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Stack>
        </Form>

        {/* Development hint section */}
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f4f4f4', 
          borderRadius: '0.25rem',
          border: '1px dashed #8d8d8d'
        }}>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#6f6f6f', 
            margin: '0 0 0.5rem 0',
            fontWeight: '600'
          }}>
            🔧 Development Credentials:
          </p>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#6f6f6f', 
            margin: '0 0 0.5rem 0',
            fontFamily: 'monospace'
          }}>
            Username: <strong>user</strong><br />
            Password: <strong>123</strong>
          </p>
          <Button
            kind="ghost"
            size="sm"
            onClick={fillDevCredentials}
            disabled={isLoading}
          >
            Fill Credentials
          </Button>
        </div>

        {showHint && (
          <InlineNotification
            kind="info"
            title="Development Mode"
            subtitle="This is a temporary authentication system for development. Auth0 integration will be added later."
            lowContrast
            hideCloseButton
          />
        )}
      </Stack>
    </Tile>
  );
};

export default DevLoginForm; 