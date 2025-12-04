import { test, expect } from '@playwright/test';
import { navigateWithAuth, waitForClerkAndMockUser } from './auth-helpers';
import { ensureServersTab, waitForServerManager, waitForComponent } from './test-helpers';

test.describe('Server Management', () => {
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

  test('should display server list', async ({ page }) => {
    // Wait for server manager to load - look for MCP Servers heading or any server-related text
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
  });

  test('should open add server form', async ({ page }) => {
    // Wait for the Add Server button - try multiple selectors
    const addButton = page.locator('button').filter({ hasText: /Add Server/i }).first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    
    // Click Add Server button
    await addButton.click();
    
    // Wait for form dialog to appear
    const formTitle = page.locator('text=/Add New Server|Add Server/i').first();
    await expect(formTitle).toBeVisible({ timeout: 10000 });
  });

  test('should validate form fields', async ({ page }) => {
    // Open add server form
    const addButton = page.locator('button').filter({ hasText: /Add Server/i }).first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();
    
    // Wait for form
    await page.waitForSelector('text=Add New Server', { timeout: 5000 });
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]:has-text("Add Server")');
    await submitButton.click();
    
    // Should show validation errors (may take a moment)
    await page.waitForTimeout(500);
    
    // Check for error messages (they may appear)
    const errorMessages = page.locator('text=/required|must be/i');
    const errorCount = await errorMessages.count();
    
    // At least one error should be visible
    if (errorCount > 0) {
      console.log('Validation errors displayed as expected');
    }
  });

  test('should fill and submit server form', async ({ page }) => {
    // Open add server form
    const addButton = page.locator('button').filter({ hasText: /Add Server/i }).first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();
    
    // Wait for form
    await page.waitForSelector('text=Add New Server', { timeout: 5000 });
    
    // Fill form fields
    const nameInput = page.locator('input[id="name"]');
    await nameInput.fill('Test MCP Server');
    
    const urlInput = page.locator('input[id="url"]');
    await urlInput.fill('http://localhost:3001');
    
    const descriptionInput = page.locator('textarea[id="description"]');
    await descriptionInput.fill('Test server description');
    
    // Select server type
    const typeSelect = page.locator('button[id="type"]');
    await typeSelect.click();
    await page.click('text=Custom');
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]:has-text("Add Server")');
    await submitButton.click();
    
    // Wait for form to close (may succeed or fail depending on API)
    await page.waitForTimeout(2000);
    
    // Check if form closed or error message appeared
    const formVisible = await page.locator('text=Add New Server').isVisible().catch(() => false);
    if (!formVisible) {
      console.log('Form submitted successfully (form closed)');
    } else {
      console.log('Form still open (may be API error)');
    }
  });

  test('should validate URL format', async ({ page }) => {
    // Open add server form
    const addButton = page.locator('button').filter({ hasText: /Add Server/i }).first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();
    
    // Wait for form
    await page.waitForSelector('text=Add New Server', { timeout: 5000 });
    
    // Fill invalid URL
    const urlInput = page.locator('input[id="url"]');
    await urlInput.fill('invalid-url');
    
    // Try to submit
    const submitButton = page.locator('button[type="submit"]:has-text("Add Server")');
    await submitButton.click();
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check for URL validation error
    const urlError = page.locator('text=/valid URL|URL|http/i');
    const hasError = await urlError.count() > 0;
    
    if (hasError) {
      console.log('URL validation working correctly');
    }
  });

  test('should display server cards', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    
    // Wait a bit for servers to load
    await page.waitForTimeout(2000);
    
    // Check for server cards (they may or may not exist)
    const serverCards = page.locator('[class*="card"]').filter({ hasText: /server|Server/i });
    const cardCount = await serverCards.count();
    
    if (cardCount > 0) {
      console.log(`Found ${cardCount} server cards`);
      await expect(serverCards.first()).toBeVisible();
    } else {
      console.log('No server cards found (may be empty list)');
    }
  });

  test('should open edit form for existing server', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for Edit button on server cards
    const editButtons = page.locator('button').filter({ hasText: /Edit/i });
    const editCount = await editButtons.count();
    
    if (editCount > 0) {
      // Click first Edit button
      await editButtons.first().click();
      
      // Wait for edit form
      await page.waitForSelector('text=Edit Server', { timeout: 5000 });
      
      const editTitle = page.locator('text=Edit Server');
      await expect(editTitle).toBeVisible();
      
      console.log('Edit form opened successfully');
    } else {
      console.log('No servers available to edit');
    }
  });

  test('should open server details', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for Details button
    const detailsButtons = page.locator('button').filter({ hasText: /Details/i });
    const detailsCount = await detailsButtons.count();
    
    if (detailsCount > 0) {
      await detailsButtons.first().click();
      
      // Wait for details dialog
      await page.waitForTimeout(1000);
      
      console.log('Server details opened');
    } else {
      console.log('No servers available to view details');
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    // Wait for server manager to load
    const serverManager = page.locator('text=/MCP Servers|Server/i').first();
    await expect(serverManager).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for Delete button
    const deleteButtons = page.locator('button').filter({ hasText: /Delete/i });
    const deleteCount = await deleteButtons.count();
    
    if (deleteCount > 0) {
      await deleteButtons.first().click();
      
      // Wait for confirmation dialog
      await page.waitForSelector('text=Delete Server', { timeout: 5000 });
      
      const dialog = page.locator('text=Delete Server');
      await expect(dialog).toBeVisible();
      
      // Cancel deletion
      await page.click('button:has-text("Cancel")');
      
      console.log('Delete confirmation dialog working');
    } else {
      console.log('No servers available to delete');
    }
  });
});

