import { test as base } from '@playwright/test';
import { setupTestAuth } from './auth-setup';

/**
 * Extended test fixture with authentication bypass
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Setup auth bypass before using the page
    await setupTestAuth(page);
    
    // Mock Clerk's useUser hook to return a mock user
    await page.addInitScript(() => {
      // Create a mock user object
      const mockUser = {
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        imageUrl: '',
        hasImage: false,
        primaryEmailAddress: { emailAddress: 'test@example.com' },
      };

      // Store mock user in window for Clerk to access
      (window as any).__clerk_mock_user = mockUser;
      (window as any).__clerk_mock_loaded = true;

      // Override Clerk's internal state
      if ((window as any).Clerk) {
        (window as any).Clerk.user = mockUser;
        (window as any).Clerk.loaded = true;
      }
    });

    // Intercept Clerk API calls
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

    // Intercept sign-in redirects and allow navigation
    await page.route('**/sign-in**', (route) => {
      route.continue();
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';







