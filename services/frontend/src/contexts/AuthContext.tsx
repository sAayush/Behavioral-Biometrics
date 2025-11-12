'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuthData, saveAuthData, clearAuthData, AuthData } from '@/lib/storage';
import { wsManager } from '@/lib/websocket';
import { startTraining } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  authData: AuthData | null;
  login: (data: AuthData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load auth data from localStorage on mount
  useEffect(() => {
    const data = getAuthData();
    if (data) {
      setAuthData(data);
      setIsAuthenticated(true);
      // Reconnect WebSocket if we have auth data
      wsManager.connect(data.token).catch(console.error);
    }
  }, []);

  const login = async (data: AuthData) => {
    // Save to localStorage
    saveAuthData(data);
    setAuthData(data);
    setIsAuthenticated(true);

    // Connect WebSocket
    try {
      await wsManager.connect(data.token);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      // Continue even if WebSocket fails
    }

    // Start training (fire-and-forget)
    startTraining(data.user_id);
  };

  const logout = () => {
    wsManager.disconnect();
    clearAuthData();
    setAuthData(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, authData, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

