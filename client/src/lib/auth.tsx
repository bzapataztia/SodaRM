import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  plan: string;
  maxProperties?: number;
  propertiesCount?: number;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  async function loadUser() {
    try {
      const response = await api.auth.me();
      const data = await response.json();
      setUser(data.user);
      setTenant(data.tenant);
    } catch (error) {
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await api.auth.login(email, password);
    const data = await response.json();
    
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
    localStorage.setItem('token', data.token);
  }

  async function signup(formData: any) {
    const response = await api.auth.signup(formData);
    const data = await response.json();
    
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
    localStorage.setItem('token', data.token);
  }

  function logout() {
    setUser(null);
    setTenant(null);
    setToken(null);
    localStorage.removeItem('token');
  }

  return (
    <AuthContext.Provider value={{ user, tenant, token, login, signup, logout, isLoading }}>
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
