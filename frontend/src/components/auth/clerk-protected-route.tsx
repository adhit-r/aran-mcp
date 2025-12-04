'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export function ClerkProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authStateRef = useRef({ userId, isSignedIn, isLoaded });
  const lastPathnameRef = useRef(pathname);
  const mountTimeRef = useRef(Date.now());

  // Check if auth should be bypassed (for testing/development) - compute synchronously
  const shouldBypassAuth = (() => {
    // Check environment variables
    const envBypass = 
      process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' ||
      process.env.NODE_ENV === 'development';
    
    // Check URL query parameters using window.location (only on client)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const skipAuthParam = params.get('skipAuth') === 'true';
      const testParam = params.get('test') === 'true';
      const bypass = envBypass || skipAuthParam || testParam;
      
      if (bypass) {
        console.log('[ClerkProtectedRoute] Auth bypassed:', { envBypass, skipAuthParam, testParam });
      }
      
      return bypass;
    }
    
    return envBypass;
  })();

  // Keep refs in sync with current values
  useEffect(() => {
    authStateRef.current = { userId, isSignedIn, isLoaded };
    lastPathnameRef.current = pathname;
  }, [userId, isSignedIn, isLoaded, pathname]);

  useEffect(() => {
    // If auth is bypassed, allow access immediately
    if (shouldBypassAuth) {
      setIsRedirecting(false);
      return;
    }

    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Only check auth after Clerk is fully loaded
    if (!isLoaded) {
      return;
    }

    // If user is signed in, clear any redirect state
    if (userId || isSignedIn) {
      setIsRedirecting(false);
      return;
    }

    // If not signed in and not on auth pages, wait a bit before redirecting
    // This gives Clerk time to update its state after sign-in
    if (!userId && !isSignedIn && pathname !== '/sign-in' && pathname !== '/sign-up') {
      // If we just mounted or just navigated to this page, give Clerk more time
      // This handles the case where Clerk redirects us here after sign-in
      const timeSinceMount = Date.now() - mountTimeRef.current;
      const delay = timeSinceMount < 2000 ? 1000 : 500; // Longer delay if just mounted
      
      // Add a delay to avoid race conditions with Clerk's redirect
      redirectTimeoutRef.current = setTimeout(() => {
        // Double-check auth state before redirecting (use refs to get latest values)
        const currentAuth = authStateRef.current;
        const currentPathname = lastPathnameRef.current;
        
        // Only redirect if still not signed in and still on a protected route
        if (!currentAuth.userId && !currentAuth.isSignedIn && !isRedirecting) {
          if (currentPathname !== '/sign-in' && currentPathname !== '/sign-up') {
            setIsRedirecting(true);
            router.replace('/sign-in');
          }
        }
      }, delay);
    }

    // Cleanup timeout on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [isLoaded, userId, isSignedIn, router, pathname, isRedirecting, shouldBypassAuth]);

  // If auth is bypassed, allow access immediately
  if (shouldBypassAuth) {
    return <>{children}</>;
  }

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-aran-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is signed in, show children immediately
  if (userId || isSignedIn) {
    return <>{children}</>;
  }

  // If on auth pages, allow access
  if (pathname === '/sign-in' || pathname === '/sign-up') {
    return <>{children}</>;
  }

  // If redirecting, show loading to prevent flash
  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-aran-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If not signed in and not on auth pages, show loading while redirect is pending
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-aran-gray-600">Checking authentication...</p>
      </div>
    </div>
  );
}

