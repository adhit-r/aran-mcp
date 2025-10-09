'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Icons } from '@/components/icons';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleAutheliaLogin = () => {
    // Redirect to Authelia portal
    window.location.href = 'http://auth.mcp-sentinel.local';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-aran-white">
        <Icons.spinner className="h-8 w-8 animate-spin text-aran-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-aran-white p-4">
      <div className="aran-card w-full max-w-md">
        <div className="aran-card-header text-center">
          <h1 className="text-3xl font-bold font-display text-aran-black">MCP Sentinel</h1>
          <p className="text-aran-gray-600 mt-2">
            Secure authentication via Authelia
          </p>
        </div>
        <div className="aran-card-content space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-aran-gray-600">
              Click the button below to authenticate with Authelia
            </p>
            <button 
              onClick={handleAutheliaLogin}
              className="aran-btn-accent w-full text-lg py-3"
            >
              <Icons.lock className="mr-2 h-5 w-5" />
              Sign In with Authelia
            </button>
          </div>
          
          <div className="aran-alert aran-alert-info">
            <div className="text-center">
              <p className="font-semibold text-aran-black">Test Credentials:</p>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>Username:</strong> <code className="bg-aran-gray-100 px-2 py-1 rounded">admin</code></p>
                <p><strong>Password:</strong> <code className="bg-aran-gray-100 px-2 py-1 rounded">admin123</code></p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-aran-gray-500">
              <Icons.shield className="h-4 w-4" />
              <span className="text-xs">Secure authentication powered by Authelia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}