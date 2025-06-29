import React, { useEffect, useRef } from 'react';
import { TextInput, Button } from '@carbon/react';
import { Send } from '@carbon/icons-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onNewMessage: (message: Message) => void;
}

export default function ChatInterface({ messages, onNewMessage }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim()) return;

    const message: Message = {
      role: 'user',
      content: input.value.trim(),
      timestamp: new Date()
    };

    onNewMessage(message);
    input.value = '';

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        role: 'assistant',
        content: 'I heard you! This is a simulated response from the AI voice agent.',
        timestamp: new Date()
      };
      onNewMessage(aiResponse);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      maxHeight: '350px'
    }}>
      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '0.5rem',
        marginBottom: '1rem'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6f6f6f',
            padding: '2rem 0'
          }}>
            <p>💬 Start a conversation</p>
            <p style={{ fontSize: '0.875rem' }}>
              Voice messages will appear here
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index}
              style={{
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: message.role === 'user' 
                  ? '#0F62FE'  // Blue for user
                  : '#f4f4f4', // Light gray for AI
                color: message.role === 'user' ? 'white' : '#262626'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.875rem',
                  lineHeight: 1.4
                }}>
                  {message.content}
                </p>
              </div>
              {message.timestamp && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#8d8d8d',
                  marginTop: '0.25rem',
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  {formatTime(message.timestamp)}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Text Input */}
      <form onSubmit={handleSendMessage} style={{ 
        display: 'flex', 
        gap: '0.5rem',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1 }}>
          <TextInput
            ref={inputRef}
            id="message-input"
            labelText=""
            placeholder="Type a message..."
            size="sm"
          />
        </div>
        <Button
          type="submit"
          kind="primary"
          size="sm"
          renderIcon={Send}
          iconDescription="Send message"
          hasIconOnly
        />
      </form>
    </div>
  );
} 