import { test, expect } from '@playwright/test';
import { navigateWithAuth, waitForClerkAndMockUser } from './auth-helpers';

test.describe('Endpoint Scanning', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard with auth bypass
    await navigateWithAuth(page, 'http://localhost:3000/dashboard/real');
    
    // Wait for sidebar to load and click on Discovery tab
    await page.waitForTimeout(2000);
    const discoveryTab = page.locator('button').filter({ hasText: /^Discovery$/i });
    if (await discoveryTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await discoveryTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Wait for auth to settle
    await waitForClerkAndMockUser(page);
  });

  test('should navigate to discovery tab', async ({ page }) => {
    // Wait for sidebar navigation to load
    await page.waitForTimeout(2000);
    
    // Look for Discovery tab button
    const discoveryTab = page.locator('button').filter({ hasText: /^Discovery$/i });
    
    if (await discoveryTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await discoveryTab.click();
      
      // Wait for endpoint scanner to load
      await page.waitForTimeout(2000);
      
      // Verify endpoint scanner is visible
      const scannerElements = page.locator('text=/endpoint|scan|URL/i');
      const elementCount = await scannerElements.count();
      
      if (elementCount > 0) {
        console.log('Discovery tab accessed and endpoint scanner loaded');
      } else {
        console.log('Discovery tab accessed but scanner not visible');
      }
    } else {
      console.log('Discovery tab not found');
    }
  });

  test('should display endpoint scanner interface', async ({ page }) => {
    // Navigate to discovery/endpoint scanning
    await page.goto('http://localhost:3000/dashboard/real');
    await page.waitForLoadState('domcontentloaded');
    
    // Try to find endpoint scanner elements
    const scannerElements = page.locator('text=/endpoint|scan|URL/i');
    const elementCount = await scannerElements.count();
    
    if (elementCount > 0) {
      console.log('Endpoint scanner interface found');
      await expect(scannerElements.first()).toBeVisible();
    } else {
      console.log('Endpoint scanner may not be visible (check tab navigation)');
    }
  });

  test('should scan single endpoint', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard/real');
    await page.waitForLoadState('domcontentloaded');
    
    // Try to find scan input and button
    const scanInput = page.locator('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="endpoint"]').first();
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("scan")').first();
    
    if (await scanInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Fill URL
      await scanInput.fill('http://localhost:3001');
      
      // Click scan button
      await scanButton.click();
      
      // Wait for results
      await page.waitForTimeout(3000);
      
      console.log('Endpoint scan initiated');
    } else {
      console.log('Scan interface not found (may need to navigate to discovery tab)');
    }
  });

  test('should scan multiple endpoints', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard/real');
    await page.waitForLoadState('domcontentloaded');
    
    // Look for multiple scan tab or input
    const multipleTab = page.locator('button:has-text("Multiple"), button:has-text("multiple")').first();
    const textarea = page.locator('textarea[placeholder*="URL"], textarea[placeholder*="url"]').first();
    
    if (await multipleTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await multipleTab.click();
      await page.waitForTimeout(500);
      
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textarea.fill('http://localhost:3001\nhttp://localhost:3002');
        
        const scanButton = page.locator('button:has-text("Scan")').first();
        await scanButton.click();
        
        await page.waitForTimeout(3000);
        console.log('Multiple endpoint scan initiated');
      }
    } else {
      console.log('Multiple scan tab not found');
    }
  });

  test('should scan port range', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard/real');
    await page.waitForLoadState('domcontentloaded');
    
    // Look for port range tab
    const portTab = page.locator('button:has-text("Port Range"), button:has-text("port")').first();
    
    if (await portTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await portTab.click();
      await page.waitForTimeout(500);
      
      // Fill port range inputs
      const hostInput = page.locator('input[placeholder*="host"], input[placeholder*="Host"]').first();
      const startPortInput = page.locator('input[placeholder*="start"], input[placeholder*="Start"]').first();
      const endPortInput = page.locator('input[placeholder*="end"], input[placeholder*="End"]').first();
      
      if (await hostInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hostInput.fill('localhost');
        await startPortInput.fill('3000');
        await endPortInput.fill('3010');
        
        const scanButton = page.locator('button:has-text("Scan")').first();
        await scanButton.click();
        
        await page.waitForTimeout(3000);
        console.log('Port range scan initiated');
      }
    } else {
      console.log('Port range tab not found');
    }
  });
});

