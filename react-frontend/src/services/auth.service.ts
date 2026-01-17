import { apiRequest } from './api.config';
import type { User, AuthResponse } from '../types/auth';

// Re-export types for convenience
export type { User, AuthResponse } from '../types/auth';

export const authService = {
  /**
   * Authenticate with Google ID Token
   */
  async authenticateWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await apiRequest<{ data: AuthResponse }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    return response.data;
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiRequest<{ data: User }>('/auth/me', {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Store token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  /**
   * Remove token from localStorage
   */
  removeToken(): void {
    localStorage.removeItem('auth_token');
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  },

  /**
   * Get token expiry time in milliseconds
   */
  getTokenExpiryTime(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  },
};
