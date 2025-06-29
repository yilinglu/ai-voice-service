import React from 'react';
import { useAuth } from '../components/auth';

export default function DebugAuth() {
  const authContext = useAuth();
  const { user, isLoading, checkAuthStatus } = authContext;

  const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('plutus-auth') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('plutus-user') : null;

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'monospace',
      backgroundColor: '#f4f4f4',
      minHeight: '100vh'
    }}>
      <h1>🔍 Plutus Authentication Debug</h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        marginBottom: '1rem',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }}>
        <h2>Auth Context State:</h2>
        <pre style={{ backgroundColor: '#f8f8f8', padding: '1rem' }}>
          {JSON.stringify({
            isLoading,
            user,
            userExists: !!user,
            isAuthenticated: user?.isAuthenticated
          }, null, 2)}
        </pre>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        marginBottom: '1rem',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }}>
        <h2>LocalStorage State:</h2>
        <pre style={{ backgroundColor: '#f8f8f8', padding: '1rem' }}>
          {JSON.stringify({
            'plutus-auth': storedAuth,
            'plutus-user': storedUser ? JSON.parse(storedUser) : null
          }, null, 2)}
        </pre>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        marginBottom: '1rem',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }}>
        <h2>Authentication Logic:</h2>
        <p><strong>Should show loading?</strong> {isLoading ? '✅ YES' : '❌ NO'}</p>
        <p><strong>Should show login?</strong> {!user?.isAuthenticated ? '✅ YES' : '❌ NO'}</p>
        <p><strong>Should show main app?</strong> {user?.isAuthenticated ? '✅ YES' : '❌ NO'}</p>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        marginBottom: '1rem',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }}>
        <h2>Actions:</h2>
        <button 
          onClick={checkAuthStatus}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '1rem',
            backgroundColor: '#0f62fe',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Re-check Auth Status
        </button>
        
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '1rem',
            backgroundColor: '#da1e28',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Storage & Reload
        </button>

        <a 
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#198038',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          🔐 Go to Login
        </a>
      </div>

      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '1.5rem', 
        borderRadius: '8px',
        border: '1px solid #ffeaa7'
      }}>
        <h3>💡 Expected Behavior:</h3>
        <ol>
          <li>If not logged in: <code>isLoading: false</code>, <code>user: null</code></li>
          <li>After login: <code>isLoading: false</code>, <code>user.isAuthenticated: true</code></li>
          <li>Main page should redirect to login if <code>!user?.isAuthenticated</code></li>
        </ol>
      </div>
    </div>
  );
} 