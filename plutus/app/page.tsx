'use client'

import { useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState<string>('Ready to test')

  const testWebhook = async () => {
    setStatus('Testing webhook...')
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hello, this is a test message',
          session_id: 'test-session',
          turn_id: 'test-turn',
          type: 'message'
        }),
      })
      
      if (response.ok) {
        setStatus('Webhook test successful!')
      } else {
        setStatus(`Webhook test failed: ${response.status}`)
      }
    } catch (error) {
      setStatus(`Webhook test error: ${error}`)
    }
  }

  const testAuthorize = async () => {
    setStatus('Testing authorization...')
    try {
      const response = await fetch('/api/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipeline_id: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID || 'your-pipeline-id'
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setStatus(`Authorization successful! Session: ${data.session_id}`)
      } else {
        setStatus(`Authorization failed: ${response.status}`)
      }
    } catch (error) {
      setStatus(`Authorization error: ${error}`)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      padding: '3rem 1rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '28rem', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '2rem' 
          }}>
            Plutus Voice Agent
          </h1>
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '2rem' 
          }}>
            Next.js backend server for Layercode voice agent integration
          </p>
          
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={testWebhook}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                marginBottom: '1rem',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1d4ed8'}
              onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb'}
            >
              Test Webhook Endpoint
            </button>
            
            <button
              onClick={testAuthorize}
              style={{
                width: '100%',
                backgroundColor: '#059669',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#047857'}
              onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#059669'}
            >
              Test Authorization Endpoint
            </button>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f9fafb', 
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
              Status:
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
              {status}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 