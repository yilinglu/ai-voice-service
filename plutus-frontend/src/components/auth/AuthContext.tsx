import React, { createContext, useContext, useState, useEffect } from 'react';

// Define user interface
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'dev' | 'auth0' | 'guest';
  isAuthenticated: boolean;
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<boolean>;
  loginWithAuth0: () => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // EXPLICIT INITIAL STATE - NOT AUTHENTICATED
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = () => {
    console.log('🔍 Starting auth status check...');
    setIsLoading(true);
    
    try {
      // Server-side rendering safety check
      if (typeof window === 'undefined') {
        console.log('🖥️ SSR detected, marking as not authenticated');
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check for stored authentication with explicit validation
      const storedAuth = localStorage.getItem('plutus-auth');
      const storedUser = localStorage.getItem('plutus-user');
      
      console.log('🔐 Checking stored auth:', { 
        storedAuth, 
        hasStoredUser: !!storedUser,
        authValue: storedAuth,
        isAuthTrue: storedAuth === 'true'
      });
      
      // STRICT AUTHENTICATION CHECK - ALL conditions must be met
      if (storedAuth === 'true' && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          // Validate user data structure
          if (userData && 
              typeof userData === 'object' && 
              userData.id && 
              userData.username && 
              userData.isAuthenticated === true) {
            
            console.log('✅ Valid stored user found:', userData);
            setUser(userData);
          } else {
            console.warn('⚠️ Invalid stored user data, clearing authentication');
            localStorage.removeItem('plutus-auth');
            localStorage.removeItem('plutus-user');
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Error parsing stored user data:', error);
          localStorage.removeItem('plutus-auth');
          localStorage.removeItem('plutus-user');
          setUser(null);
        }
      } else {
        console.log('🔒 No valid authentication found, setting user to null');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error during auth status check:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('🏁 Auth status check completed, isLoading set to false');
    }
  };

  // Development login function
  const login = async (credentials: { username: string; password: string }): Promise<boolean> => {
    console.log('🔑 Attempting login with credentials:', { username: credentials.username });
    
    try {
      // Simple development authentication
      if (credentials.username === 'user' && credentials.password === '123') {
        const newUser: User = {
          id: 'dev-user-123',
          username: credentials.username,
          email: 'dev@plutus.local',
          role: 'dev',
          isAuthenticated: true // EXPLICITLY SET TO TRUE
        };

        console.log('✅ Login successful, storing user:', newUser);
        
        // Store authentication state
        localStorage.setItem('plutus-auth', 'true');
        localStorage.setItem('plutus-user', JSON.stringify(newUser));
        
        // Update state
        setUser(newUser);
        
        return true;
      } else {
        console.log('❌ Invalid credentials provided');
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    }
  };

  // Auth0 login placeholder
  const loginWithAuth0 = async (): Promise<void> => {
    console.log('🔑 Auth0 login requested');
    // TODO: Implement Auth0 integration
    const auth0User: User = {
      id: 'auth0-user-456',
      username: 'enterprise_user',
      email: 'user@company.com',
      role: 'auth0',
      isAuthenticated: true
    };
    
    localStorage.setItem('plutus-auth', 'true');
    localStorage.setItem('plutus-user', JSON.stringify(auth0User));
    setUser(auth0User);
  };

  // Logout function
  const logout = () => {
    console.log('🚪 Logging out user');
    
    // Clear all authentication data
    localStorage.removeItem('plutus-auth');
    localStorage.removeItem('plutus-user');
    
    // Reset state to NOT AUTHENTICATED
    setUser(null);
    setIsLoading(false);
    
    console.log('✅ Logout completed, user set to null');
  };

  // Check authentication on mount
  useEffect(() => {
    console.log('🚀 AuthProvider mounted, checking auth status...');
    checkAuthStatus();
  }, []);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔄 Auth state changed:', { 
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role,
        isAuthenticated: user.isAuthenticated
      } : null,
      isLoading,
      timestamp: new Date().toISOString()
    });
  }, [user, isLoading]);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    login,
    loginWithAuth0,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 