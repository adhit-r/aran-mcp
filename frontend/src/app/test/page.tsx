'use client';

import { useState } from 'react';
import { Logo } from '@/components/logo';

export default function TestPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-aran-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-aran-black mb-8">Test Page</h1>
        
        <div className="aran-card p-6 mb-6">
          <h2 className="text-2xl font-bold text-aran-black mb-4">Basic Test</h2>
          <p className="text-aran-gray-600 mb-4">
            This is a simple test page to check if the basic components work.
          </p>
          <button 
            onClick={() => setCount(count + 1)}
            className="aran-btn-primary"
          >
            Count: {count}
          </button>
        </div>

        <div className="aran-card p-6 mb-6">
          <h2 className="text-2xl font-bold text-aran-black mb-4">Logo Test</h2>
          <div className="flex items-center gap-4">
            <Logo size="sm" variant="icon" />
            <Logo size="md" variant="icon" />
            <Logo size="lg" variant="icon" />
            <Logo size="xl" variant="icon" />
          </div>
        </div>

        <div className="aran-card p-6">
          <h2 className="text-2xl font-bold text-aran-black mb-4">Font Test</h2>
          <p className="text-lg text-aran-gray-600 mb-2">This should be in Space Grotesk font.</p>
          <p className="text-sm text-aran-gray-500">Small text test.</p>
          <p className="text-xs text-aran-gray-400">Extra small text test.</p>
        </div>
      </div>
    </div>
  );
}