import { Page } from '@playwright/test';

/**
 * Wait for Clerk to load and mock the user
 */
export async function waitForClerkAndMockUser(page: Page) {
  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  
  // Wait a bit for Clerk to initialize
  await page.waitForTimeout(1000);

  // Inject mock user data
  await page.evaluate(() => {
    // Mock Clerk's useUser hook return value
    const mockUser = {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: '',
      hasImage: false,
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    };

    // Store in window for Clerk components to access
    (window as any).__clerk_mock_user = mockUser;
    (window as any).__clerk_mock_loaded = true;

    // Try to override Clerk if it exists
    if ((window as any).Clerk) {
      (window as any).Clerk.user = mockUser;
      (window as any).Clerk.loaded = true;
      (window as any).Clerk.session = { id: 'mock-session-id' };
    }
  });

  // Wait for any auth checks to complete
  await page.waitForTimeout(500);
}

/**
 * Bypass Clerk authentication by mocking the protected route
 */
export async function bypassAuth(page: Page) {
  // Intercept and allow all routes
  await page.route('**/*', (route) => {
    route.continue();
  });

  // Mock Clerk API endpoints
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
        session: { id: 'mock-session-id' },
      }),
    });
  });
}

/**
 * Navigate to a protected route with auth bypass
 */
export async function navigateWithAuth(page: Page, url: string) {
  await bypassAuth(page);
  await page.goto(url);
  await waitForClerkAndMockUser(page);
}






