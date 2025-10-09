'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkAutheliaAuth, logoutFromAuthelia, type AutheliaUser } from '@/lib/authelia';

type User = {
  id: string;
  email: string;
  name: string;
  username?: string;
  groups?: string[];
  auth_method?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Authelia authentication
        const authSession = await checkAutheliaAuth();
        if (authSession.isAuthenticated && authSession.user) {
          setUser({
            id: authSession.user.username,
            email: authSession.user.email,
            name: authSession.user.displayName,
            username: authSession.user.username,
            groups: authSession.user.groups,
            auth_method: 'authelia',
          });
          console.log('Auth context: User authenticated via Authelia:', authSession.user.email);
        } else {
          setUser(null);
          console.log('Auth context: User not authenticated via Authelia');
        }
      } catch (error) {
        console.log('Auth context: Authelia auth check failed:', error);
        setUser(null);
        // Don't redirect automatically - let the components handle it
      } finally {
        setIsLoading(false);
      }
    };

    // Only check auth once on mount
    if (isLoading) {
      checkAuth();
    }
  }, [isLoading]);

  const logout = async () => {
    try {
      setUser(null);
      await logoutFromAuthelia();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect to login even if logout fails
      router.push('/login');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
