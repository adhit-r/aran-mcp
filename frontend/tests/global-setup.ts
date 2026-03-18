import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Setup any global test configuration here
  // For example, you could set environment variables
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key';
  process.env.CLERK_SECRET_KEY = 'sk_test_mock_key';
}

export default globalSetup;







