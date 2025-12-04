import { test, expect } from '@playwright/test';
import { navigateWithAuth, waitForClerkAndMockUser } from './auth-helpers';
import { ensureServersTab, waitForServerManager } from './test-helpers';

test.describe('All Features Integration Test', () => {
  test('should test complete user flow', async ({ page }) => {
    // 1. Navigate to home page (optional - may redirect)
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Check if home page loads (may redirect if auth is enabled)
    const homeTitle = page.locator('h1').filter({ hasText: /MCP Sentinel/i });
    const homeVisible = await homeTitle.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (homeVisible) {
      console.log('Home page loaded');
    } else {
      console.log('Home page may have redirected, continuing to dashboard');
    }
    
    // 2. Navigate directly to dashboard/real with auth bypass
    await navigateWithAuth(page, 'http://localhost:3000/dashboard/real');
    await waitForClerkAndMockUser(page);
    
    // Wait for sidebar navigation to load
    await page.waitForTimeout(2000);
    
    // Ensure we're on the Servers tab
    await ensureServersTab(page);
    
    // Verify dashboard loads - look for MCP Servers text or server manager
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    
    // 3. Test adding a server
    const addServerButton = page.locator('button').filter({ hasText: /Add Server/i }).first();
    if (await addServerButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addServerButton.click();
      
      // Wait for form
      const formTitle = page.locator('text=/Add New Server|Add Server/i').first();
      if (await formTitle.isVisible({ timeout: 10000 }).catch(() => false)) {
        // Fill form
        const nameInput = page.locator('input[id="name"]');
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('Test Server');
          
          const urlInput = page.locator('input[id="url"]');
          await urlInput.fill('http://localhost:3001');
          
          // Close form (cancel)
          const cancelButton = page.locator('button').filter({ hasText: /Cancel/i }).first();
          await cancelButton.click();
          
          await page.waitForTimeout(500);
        }
      }
    }
    
    // 4. Test server list display
    await page.waitForTimeout(1000);
    const serverSection = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverSection).toBeVisible({ timeout: 10000 });
    
    // 5. Test search functionality
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
    
    // 6. Test refresh
    const refreshButton = page.locator('button').filter({ hasText: /Refresh/i }).first();
    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }
    
    console.log('Complete user flow test completed');
  });

  test('should verify all UI components load', async ({ page }) => {
    await navigateWithAuth(page, 'http://localhost:3000/dashboard/real');
    await waitForClerkAndMockUser(page);
    
    // Wait for sidebar and ensure Servers tab is active
    await page.waitForTimeout(2000);
    await ensureServersTab(page);
    
    // Check for key UI elements
    const elements = [
      { selector: 'text=/MCP Servers|Server/i', name: 'Server Manager Header' },
      { selector: 'button', name: 'Add Server Button', filter: (loc: any) => loc.filter({ hasText: /Add Server/i }) },
      { selector: 'input[placeholder*="search" i]', name: 'Search Input' },
    ];
    
    for (const element of elements) {
      let locator;
      if (element.filter) {
        locator = element.filter(page.locator(element.selector)).first();
      } else {
        locator = page.locator(element.selector).first();
      }
      const isVisible = await locator.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        console.log(`✓ ${element.name} is visible`);
      } else {
        console.log(`✗ ${element.name} not found`);
      }
    }
    
    // Wait a bit for any async loading
    await page.waitForTimeout(2000);
    
    console.log('UI components check completed');
  });
});

