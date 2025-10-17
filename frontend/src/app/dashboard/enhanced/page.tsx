'use client';

import { RealMCPDashboard } from '@/components/dashboard/real-mcp-dashboard';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { AuthenticatedLayout } from '@/components/authenticated-layout';
import { ErrorBoundary } from '@/components/error-boundary';

export default function EnhancedDashboardPage() {
  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <AuthenticatedLayout>
          <RealMCPDashboard />
        </AuthenticatedLayout>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}