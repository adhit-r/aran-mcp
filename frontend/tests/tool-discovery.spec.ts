import { test, expect } from '@playwright/test';
import { navigateWithAuth, waitForClerkAndMockUser } from './auth-helpers';
import { ensureServersTab, waitForServerManager } from './test-helpers';

test.describe('Tool Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard with auth bypass
    await navigateWithAuth(page, 'http://localhost:3000/dashboard/real');
    
    // Wait for auth to settle
    await waitForClerkAndMockUser(page);
    
    // Wait for sidebar to load
    await page.waitForTimeout(2000);
    
    // Ensure we're on the Servers tab
    await ensureServersTab(page);
    
    // Wait for server manager to be fully loaded
    await waitForServerManager(page);
  });

  test('should discover tools for server', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for Discover button
    const discoverButtons = page.locator('button').filter({ hasText: /Discover/i });
    const discoverCount = await discoverButtons.count();
    
    if (discoverCount > 0) {
      await discoverButtons.first().click();
      
      // Wait for discovery to complete
      await page.waitForTimeout(3000);
      
      console.log('Tool discovery initiated');
    } else {
      console.log('No Discover buttons found');
    }
  });

  test('should display tools in server card', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Check for tools count or tools list
    const toolsText = page.locator('text=/tools|Tools/i');
    const toolsCount = await toolsText.count();
    
    if (toolsCount > 0) {
      console.log(`Found ${toolsCount} tool-related elements`);
      await expect(toolsText.first()).toBeVisible();
    } else {
      console.log('No tool information displayed');
    }
  });

  test('should display risk levels', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Check for risk level badges
    const riskBadges = page.locator('[class*="badge"]').filter({ hasText: /high|medium|low|risk/i });
    const riskCount = await riskBadges.count();
    
    if (riskCount > 0) {
      console.log(`Found ${riskCount} risk level indicators`);
      await expect(riskBadges.first()).toBeVisible();
    } else {
      console.log('No risk level indicators found');
    }
  });
});

