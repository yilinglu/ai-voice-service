import React from 'react';
import {
  Button,
  Tag,
  Stack,
  HeaderGlobalAction
} from '@carbon/react';
import { Logout, User } from '@carbon/icons-react';
import { useAuth } from './AuthContext';

interface UserProfileProps {
  compact?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ compact = false }) => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const getRoleBadgeKind = (role: string) => {
    switch (role) {
      case 'dev':
        return 'cyan';
      case 'auth0':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'dev':
        return 'Developer';
      case 'auth0':
        return 'Enterprise';
      default:
        return 'Guest';
    }
  };

  if (compact) {
    // Compact version for header
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Tag type={getRoleBadgeKind(user.role)} size="sm">
          {getRoleDisplayName(user.role)}
        </Tag>
        <span style={{ fontSize: '0.875rem', color: '#161616' }}>
          {user.username}
        </span>
        <HeaderGlobalAction
          aria-label="Sign out"
          onClick={handleLogout}
          tooltipAlignment="end"
        >
          <Logout size={20} />
        </HeaderGlobalAction>
      </div>
    );
  }

  // Full profile card
  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <Stack gap={4}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <User size={20} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
              {user.username}
            </h4>
            {user.email && (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6f6f6f' }}>
                {user.email}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>Status:</span>
          <Tag type={getRoleBadgeKind(user.role)} size="sm">
            {getRoleDisplayName(user.role)} User
          </Tag>
        </div>

        {user.role === 'dev' && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f4f4f4',
            borderRadius: '4px',
            border: '1px dashed #8d8d8d'
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '0.75rem', 
              color: '#6f6f6f',
              fontWeight: '600'
            }}>
              🔧 Development Mode Active
            </p>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.75rem', 
              color: '#6f6f6f'
            }}>
              Full access to all application features for testing and development.
            </p>
          </div>
        )}

        <Button
          kind="ghost"
          size="sm"
          onClick={handleLogout}
          renderIcon={Logout}
        >
          Sign Out
        </Button>
      </Stack>
    </div>
  );
};

export default UserProfile; 