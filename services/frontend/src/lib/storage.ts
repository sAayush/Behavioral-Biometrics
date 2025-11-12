// LocalStorage utilities for auth state

const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const EMAIL_KEY = 'user_email';

export interface AuthData {
  token: string;
  user_id: string;
  email: string;
}

/**
 * Save authentication data to localStorage
 */
export function saveAuthData(data: AuthData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_ID_KEY, data.user_id);
    localStorage.setItem(EMAIL_KEY, data.email);
  }
}

/**
 * Get authentication data from localStorage
 */
export function getAuthData(): AuthData | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem(TOKEN_KEY);
  const user_id = localStorage.getItem(USER_ID_KEY);
  const email = localStorage.getItem(EMAIL_KEY);

  if (token && user_id && email) {
    return { token, user_id, email };
  }

  return null;
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }
}

/**
 * Get token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get user ID from localStorage
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

