import React from 'react';

interface StatusLabelControlProps {
  status: string;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export default function StatusLabelControl({ 
  status, 
  className = '',
  showIcon = true,
  compact = false
}: StatusLabelControlProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'connected':
        return { 
          text: compact ? 'Connected' : 'Connected & Ready', 
          icon: '🟢', 
          color: '#198038',
          bgColor: '#e8f5e8' 
        };
      case 'connecting':
        return { 
          text: compact ? 'Connecting' : 'Connecting...', 
          icon: '🟡', 
          color: '#0F62FE',
          bgColor: '#e8f3ff' 
        };
      case 'error':
        return { 
          text: compact ? 'Error' : 'Connection Error', 
          icon: '🔴', 
          color: '#DA1E28',
          bgColor: '#fdf2f2' 
        };
      case 'disconnected':
        return { 
          text: 'Disconnected', 
          icon: '⚫', 
          color: '#8D8D8D',
          bgColor: '#f4f4f4' 
        };
      default:
        return { 
          text: compact ? 'Starting' : 'Initializing...', 
          icon: '⚪', 
          color: '#8D8D8D',
          bgColor: '#f4f4f4' 
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div 
      className={`status-label ${className}`} 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: compact ? '0.5rem 0.75rem' : '0.75rem 1rem',
        backgroundColor: statusInfo.bgColor,
        borderRadius: '0.5rem',
        border: `1px solid ${statusInfo.color}30`,
        fontSize: compact ? '0.75rem' : '0.875rem',
        fontWeight: '500',
        transition: 'all 0.3s ease'
      }}
    >
      {showIcon && (
        <span style={{ fontSize: compact ? '0.875rem' : '1rem' }}>
          {statusInfo.icon}
        </span>
      )}
      <span style={{ color: statusInfo.color }}>
        {statusInfo.text}
      </span>
    </div>
  );
} 