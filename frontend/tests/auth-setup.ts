import { Page } from '@playwright/test';

/**
 * Mock Clerk authentication by injecting mock user data
 * This bypasses the ClerkProtectedRoute component
 */
export async function mockClerkAuth(page: Page) {
  // Inject mock Clerk user data into the page
  await page.addInitScript(() => {
    // Mock Clerk's useUser hook
    (window as any).__CLERK_MOCK_USER = {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: '',
    };

    // Override Clerk's user state
    Object.defineProperty(window, '__clerk_user', {
      value: (window as any).__CLERK_MOCK_USER,
      writable: true,
      configurable: true,
    });
  });

  // Set localStorage to simulate authenticated state
  await page.addInitScript(() => {
    localStorage.setItem('__clerk_db_jwt', 'mock-jwt-token');
    localStorage.setItem('__clerk_client', JSON.stringify({
      session: { id: 'mock-session-id' },
      user: (window as any).__CLERK_MOCK_USER,
    }));
  });
}

/**
 * Bypass Clerk authentication by intercepting redirects
 */
export async function bypassClerkAuth(page: Page) {
  // Intercept navigation to sign-in page and allow it
  await page.route('**/sign-in**', (route) => {
    route.continue();
  });

  // Mock Clerk API calls
  await page.route('**/api/clerk/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          firstName: 'Test',
          lastName: 'User',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
        },
      }),
    });
  });
}

/**
 * Setup authentication for tests
 * Combines mocking and bypassing
 */
export async function setupTestAuth(page: Page) {
  await mockClerkAuth(page);
  await bypassClerkAuth(page);
}







