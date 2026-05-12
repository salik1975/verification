import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { hashPassword } from '../../utils/passwordUtils';

const API_BASE = import.meta.env.VITE_API_BACKEND_URL;
const AUTH_PREFIX = `${API_BASE}/api/v1/auth`;

interface User {
  user_id: number;
  name: string;
  username: string;
  email: string;
  roles: string[];
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (usernameOrEmail: string, passwordOrOtp: string, mode?: 'password' | 'otp') => Promise<void>;
  logout: () => void;
  sendOtp: (usernameOrEmail: string) => Promise<void>;
  verifyOtp: (usernameOrEmail: string, otp: string) => Promise<void>;
  resetPassword: (email: string, newPassword: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Validate session on load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = storedUser ? JSON.parse(storedUser).token : null;
    if (token) {
      axios.get(`${AUTH_PREFIX}/session`, { params: { token } })
        .then(res => {
          setUser({ ...res.data, token });
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('user');
        });
    }
  }, []);

  const login = async (usernameOrEmail: string, passwordOrOtp: string, mode: 'password' | 'otp' = 'password') => {
    if (mode === 'password') {
      // Password is already hashed by the calling component (LoginModal)
      const res = await axios.post(`${AUTH_PREFIX}/login`, { username_or_email: usernameOrEmail, password: passwordOrOtp });
      setUser({ ...res.data, token: res.data.token });
      localStorage.setItem('user', JSON.stringify({ ...res.data, token: res.data.token }));
    } else {
      const res = await axios.post(`${AUTH_PREFIX}/login`, { username_or_email: usernameOrEmail, otp: passwordOrOtp });
      setUser({ ...res.data, token: res.data.token });
      localStorage.setItem('user', JSON.stringify({ ...res.data, token: res.data.token }));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const sendOtp = async (usernameOrEmail: string) => {
    await axios.post(`${AUTH_PREFIX}/send-otp`, { username_or_email: usernameOrEmail });
  };

  const verifyOtp = async (usernameOrEmail: string, otp: string) => {
    const res = await axios.post(`${AUTH_PREFIX}/verify-otp`, { username_or_email: usernameOrEmail, otp });
    setUser(res.data);
    localStorage.setItem('user', JSON.stringify(res.data));
  };

  const forgotPassword = async (email: string) => {
    await axios.post(`${AUTH_PREFIX}/forgot-password`, { email });
  };

  const resetPassword = async (email: string, newPassword: string, otp: string) => {
    // Password is already hashed by the calling component (LoginModal)
    await axios.post(`${AUTH_PREFIX}/reset-password`, { email, new_password: newPassword, otp });
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, sendOtp, verifyOtp, resetPassword, forgotPassword, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};