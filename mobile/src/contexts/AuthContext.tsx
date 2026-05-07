import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, signup as signupRequest, updateProfile as updateProfileRequest } from '../lib/api/auth';
import { setUnauthorizedHandler } from '../lib/api/client';
import { clearAuthTokens, getAccessToken, getCurrentUser } from '../lib/storage/tokenStorage';
import { User } from '../types/models';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (payload: {
    email: string;
    password: string;
    department: string;
    nickname: string;
    phoneNumber: string;
  }) => Promise<User>;
  updateProfile: (payload: { nickname?: string; department?: string }) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        const [token, storedUser] = await Promise.all([getAccessToken(), getCurrentUser()]);
        if (token && storedUser) {
          setUser(storedUser);
          return;
        }

        if (token || storedUser) {
          await clearAuthTokens();
        }
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateAuth();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearAuthTokens();
      setUser(null);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isHydrating,
      signIn: async (email: string, password: string) => {
        const authenticatedUser = await loginRequest({ email, password });
        setUser(authenticatedUser);
        return authenticatedUser;
      },
      signUp: async (payload) => {
        const authenticatedUser = await signupRequest(payload);
        setUser(authenticatedUser);
        return authenticatedUser;
      },
      updateProfile: async (payload) => {
        const updatedUser = await updateProfileRequest(payload);
        setUser(updatedUser);
        return updatedUser;
      },
      signOut: async () => {
        await clearAuthTokens();
        setUser(null);
      },
    }),
    [isHydrating, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
