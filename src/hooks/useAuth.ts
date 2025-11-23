import { useState, useEffect, createContext, useContext } from 'react';
import { apiClient, handleApiError } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email?: string;
  nombre_completo: string;
  rol: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          apiClient.setToken(token);
          const response = await apiClient.verifyToken();
          if (response.valid) {
            setUser(response.user);
          } else {
            localStorage.removeItem('auth_token');
            apiClient.setToken(null);
          }
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('auth_token');
        apiClient.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, unlockCode?: string) => {
    try {
      setLoading(true);
      const response = await apiClient.login(email, password, unlockCode);
      apiClient.setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
};

export { AuthContext };
export type { User, AuthContextType };
