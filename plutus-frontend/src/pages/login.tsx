import React, { useState } from 'react';
import {
  Button,
  TextInput,
  PasswordInput,
  Form,
  Stack,
  Tile,
  Content,
  Theme,
  InlineNotification
} from '@carbon/react';
import { Login } from '@carbon/icons-react';

export default function DirectLogin() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    console.log('Login attempt:', credentials);
    
    if (credentials.username === 'user' && credentials.password === '123') {
      setSuccess(true);
      setError(null);
      
      // Store authentication for the main app
      localStorage.setItem('plutus-auth', 'true');
      localStorage.setItem('plutus-user', JSON.stringify({
        id: 'dev-user-001',
        username: credentials.username,
        email: 'dev@plutus.local',
        role: 'dev',
        isAuthenticated: true
      }));
      
      // Redirect to main app after login
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } else {
      setError('Invalid credentials. Use username: user, password: 123');
      setSuccess(false);
    }
  };

  if (success) {
    return (
      <Theme theme="white">
        <Content style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <h1 style={{ fontSize: '1.5rem', color: '#0f62fe', marginBottom: '1rem' }}>
                ✅ Login Successful!
              </h1>
              <p style={{ fontSize: '1rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                Welcome to Plutus! Redirecting to the main application...
              </p>
              <div style={{ color: '#0f62fe' }}>🚀</div>
            </div>
          </div>
        </Content>
      </Theme>
    );
  }

  return (
    <Theme theme="white">
      <Content style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <Stack gap={6}>
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

              <Tile>
                <Stack gap={4}>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '600', 
                    margin: 0,
                    color: '#161616'
                  }}>
                    Development Login
                  </h3>
                  
                  <Form onSubmit={handleSubmit}>
                    <Stack gap={4}>
                      <TextInput
                        id="username"
                        labelText="Username"
                        placeholder="Enter username"
                        value={credentials.username}
                        onChange={(e) => setCredentials(prev => ({ 
                          ...prev, 
                          username: e.target.value 
                        }))}
                        size="lg"
                      />

                      <PasswordInput
                        id="password"
                        labelText="Password"
                        placeholder="Enter password"
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ 
                          ...prev, 
                          password: e.target.value 
                        }))}
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
                        renderIcon={Login}
                        style={{ width: '100%' }}
                        disabled={!credentials.username || !credentials.password}
                      >
                        Sign In
                      </Button>
                    </Stack>
                  </Form>
                </Stack>
              </Tile>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f4f4f4',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  margin: '0 0 0.5rem 0',
                  fontWeight: '600'
                }}>
                  🔧 Development Credentials:
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  Username: <strong>user</strong><br />
                  Password: <strong>123</strong>
                </p>
              </div>
            </Stack>
          </div>
        </div>
      </Content>
    </Theme>
  );
} 