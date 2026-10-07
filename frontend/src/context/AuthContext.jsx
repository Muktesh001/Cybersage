/**
 * CyberSage - Auth Context
 *
 * Global authentication state using React Context + useReducer.
 *
 * State:
 *   - user: { id, name, email, role } | null
 *   - token: string | null
 *   - isAuthenticated: boolean
 *   - isLoading: boolean  (initial auth check)
 *
 * Actions provided to consumers:
 *   - login(email, password)
 *   - signup(name, email, password, confirmPassword)
 *   - logout()
 *   - refreshUser()
 */

import { createContext, useReducer, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { TOKEN_KEY, USER_KEY } from '../utils/constants';

// ---- Context ----
export const AuthContext = createContext(null);

// ---- Reducer ----
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // true while we check localStorage on mount
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: true, error: null };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'INIT_DONE':
      return { ...state, isLoading: false };

    default:
      return state;
  }
};

// ---- Provider ----
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ---- Persist auth state ----
  const persistAuth = (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // ---- Initialize from localStorage on mount ----
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Verify token is still valid by fetching profile
          const response = await authService.getProfile();
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.data.user, token }
          });
        } catch {
          // Token expired or invalid
          clearAuth();
          dispatch({ type: 'INIT_DONE' });
        }
      } else {
        dispatch({ type: 'INIT_DONE' });
      }
    };

    initAuth();
  }, []);

  // ---- Signup ----
  const signup = useCallback(async (formData) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const response = await authService.signup(formData);
      const { user, token } = response.data;
      persistAuth(user, token);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      return { success: false, message: error.message, errors: error.errors };
    }
  }, []);

  // ---- Login ----
  const login = useCallback(async (formData) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const response = await authService.login(formData);
      const { user, token } = response.data;
      persistAuth(user, token);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      return { success: false, message: error.message };
    }
  }, []);

  // ---- Logout ----
  const logout = useCallback(() => {
    clearAuth();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ---- Refresh user from API ----
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getProfile();
      const updatedUser = response.data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch {
      // Silently fail
    }
  }, []);

  // ---- Clear error ----
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    ...state,
    signup,
    login,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
