import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  company_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  clearAuth: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
  company_id?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao fazer login');
          }

          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { token } = get();
        
        if (token) {
          try {
            await fetch(`${API_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          } catch (error) {
            console.error('Erro ao fazer logout:', error);
          }
        }

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao registrar usuário');
          }

          const data = await response.json();
          set({ isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Função utilitária para fazer requisições autenticadas
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const { token } = useAuthStore.getState();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro na requisição');
  }

  return response.json();
};