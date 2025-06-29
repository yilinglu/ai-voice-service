import React, { useState } from 'react';
import {
  Button,
  TextInput,
  PasswordInput,
  Form,
  Stack,
  Tile
} from '@carbon/react';

export default function LoginTest() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', credentials);
    
    if (credentials.username === 'user' && credentials.password === '123') {
      alert('Login successful! This proves the form works.');
    } else {
      alert('Invalid credentials. Try username: user, password: 123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f4f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
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
              fontSize: '1.5rem', 
              fontWeight: '600', 
              margin: '0 0 0.5rem 0' 
            }}>
              Plutus Login Test
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6f6f6f', margin: 0 }}>
              Simple form without tabs
            </p>
          </div>

          <Tile>
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

                <Button
                  type="submit"
                  size="lg"
                  style={{ width: '100%' }}
                >
                  Sign In
                </Button>
              </Stack>
            </Form>
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
              🔧 Test Credentials:
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
  );
} 