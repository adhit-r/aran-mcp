'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to onboarding for new users
    router.push('/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90 mb-2">
          Welcome to MCP Sentinel
        </h1>
        <p className="text-gray-600 dark:text-white/60">
          Redirecting to setup...
        </p>
      </div>
    </div>
  );
}
