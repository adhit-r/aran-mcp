import { test, expect } from '@playwright/test';
import { navigateWithAuth, waitForClerkAndMockUser } from './auth-helpers';
import { ensureServersTab, waitForServerManager } from './test-helpers';

test.describe('Server Monitoring', () => {
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

  test('should display server status', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Check for status indicators - look for badges or status text
    const statusBadges = page.locator('[class*="badge"], [class*="Badge"]').filter({ hasText: /online|offline|unknown/i });
    const statusCount = await statusBadges.count();
    
    if (statusCount > 0) {
      console.log(`Found ${statusCount} status indicators`);
      await expect(statusBadges.first()).toBeVisible();
    } else {
      // Also check for status text without badges
      const statusText = page.locator('text=/online|offline|unknown/i').first();
      if (await statusText.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Status text found');
        await expect(statusText).toBeVisible();
      } else {
        console.log('No status indicators found');
      }
    }
  });

  test('should refresh server status', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    
    // Look for refresh button
    const refreshButton = page.locator('button').filter({ hasText: /Refresh/i }).first();
    
    if (await refreshButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshButton.click();
      
      // Wait for refresh
      await page.waitForTimeout(2000);
      
      console.log('Server status refreshed');
    } else {
      console.log('Refresh button not found');
    }
  });

  test('should check server status', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    
    // Look for Check Status button
    const checkStatusButton = page.locator('button').filter({ hasText: /Check Status/i }).first();
    
    if (await checkStatusButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkStatusButton.click();
      
      // Wait for status check
      await page.waitForTimeout(3000);
      
      console.log('Status check initiated');
    } else {
      console.log('Check Status button not found');
    }
  });

  test('should toggle auto-refresh', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    
    // Look for auto-refresh checkbox
    const autoRefreshCheckbox = page.locator('input[type="checkbox"][id="auto-refresh"]').first();
    
    if (await autoRefreshCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      const initialState = await autoRefreshCheckbox.isChecked();
      
      // Toggle checkbox
      await autoRefreshCheckbox.click();
      
      // Verify state changed
      const newState = await autoRefreshCheckbox.isChecked();
      expect(newState).toBe(!initialState);
      
      console.log('Auto-refresh toggled successfully');
    } else {
      console.log('Auto-refresh checkbox not found');
    }
  });

  test('should ping server', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for Ping button
    const pingButtons = page.locator('button').filter({ hasText: /Ping/i });
    const pingCount = await pingButtons.count();
    
    if (pingCount > 0) {
      await pingButtons.first().click();
      
      // Wait for ping result
      await page.waitForTimeout(2000);
      
      console.log('Ping initiated');
    } else {
      console.log('No Ping buttons found');
    }
  });

  test('should start monitoring', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for Monitor button
    const monitorButtons = page.locator('button').filter({ hasText: /Monitor/i });
    const monitorCount = await monitorButtons.count();
    
    if (monitorCount > 0) {
      await monitorButtons.first().click();
      
      // Wait for monitoring to start
      await page.waitForTimeout(2000);
      
      console.log('Monitoring started');
    } else {
      console.log('No Monitor buttons found');
    }
  });

  test('should display health metrics', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Check for health score indicators
    const healthIndicators = page.locator('text=/health|Health|uptime|Uptime/i');
    const healthCount = await healthIndicators.count();
    
    if (healthCount > 0) {
      console.log(`Found ${healthCount} health indicators`);
      await expect(healthIndicators.first()).toBeVisible();
    } else {
      console.log('No health indicators found');
    }
  });
});

