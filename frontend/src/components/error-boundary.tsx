'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error!} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-aran-white">
          <div className="aran-card p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-aran-black mb-4">Something went wrong</h2>
            <p className="text-aran-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <details className="mb-4">
              <summary className="cursor-pointer text-aran-gray-500">Error details</summary>
              <pre className="mt-2 text-xs text-aran-gray-500 bg-aran-gray-100 p-2 rounded overflow-auto">
                {this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="aran-btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error fallback component
export function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-aran-white">
      <div className="aran-card p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-aran-black mb-4">Error</h2>
        <p className="text-aran-gray-600 mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="aran-btn-primary"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
