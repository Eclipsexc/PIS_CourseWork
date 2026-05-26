import { create } from 'zustand';
import { authAPI, getApiErrorMessage, getApiFieldErrors } from '../../../shared/api/client';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isHydrating: true,
  loading: false,
  error: null,

  initializeAuth: async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false, isHydrating: false });
      return;
    }

    set({ token, isHydrating: true, error: null });

    try {
      const response = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(response.data));
      set({
        user: response.data,
        token,
        isAuthenticated: true,
        isHydrating: false,
      });
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isHydrating: false,
        error: getApiErrorMessage(error, 'Не вдалося відновити сесію'),
      });
    }
  },

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { access_token } = response.data;

      localStorage.setItem('token', access_token);

      
      const userResponse = await authAPI.getCurrentUser();
      const user = userResponse.data;

      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        loading: false
      });

      return { success: true };
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Не вдалося увійти');
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      await authAPI.register(userData);
      set({ loading: false });
      return { success: true };
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Не вдалося створити акаунт');
      const fieldErrors = getApiFieldErrors(error);
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage, fieldErrors };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
