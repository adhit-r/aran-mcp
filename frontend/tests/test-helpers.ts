import { Page, Locator } from '@playwright/test';

/**
 * Wait for a component to be fully loaded and visible
 */
export async function waitForComponent(page: Page, selector: string | Locator, timeout = 15000) {
  const locator = typeof selector === 'string' ? page.locator(selector) : selector;
  await locator.waitFor({ state: 'visible', timeout });
  await page.waitForTimeout(500); // Additional wait for animations/transitions
}

/**
 * Click on a tab and wait for content to load
 */
export async function clickTabAndWait(page: Page, tabName: string, contentSelector?: string) {
  // Try multiple selectors for the tab
  const tabSelectors = [
    `button:has-text("${tabName}")`,
    `button:has-text("${tabName}")`,
    `[role="tab"]:has-text("${tabName}")`,
    `button[aria-label*="${tabName}"]`,
  ];

  let tabClicked = false;
  for (const selector of tabSelectors) {
    const tab = page.locator(selector).first();
    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tab.click();
      tabClicked = true;
      await page.waitForTimeout(1000); // Wait for tab switch animation
      break;
    }
  }

  if (!tabClicked) {
    // Try case-insensitive search
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent().catch(() => '');
      if (text && text.trim().toLowerCase() === tabName.toLowerCase()) {
        await button.click();
        tabClicked = true;
        await page.waitForTimeout(1000);
        break;
      }
    }
  }

  // Wait for content to load if selector provided
  if (contentSelector && tabClicked) {
    await waitForComponent(page, contentSelector, 10000);
  }

  return tabClicked;
}

/**
 * Wait for server manager to be fully loaded
 */
export async function waitForServerManager(page: Page) {
  // Wait for any of these indicators that the server manager is loaded
  const indicators = [
    'text=/MCP Servers/i',
    'text=/Server/i',
    'button:has-text("Add Server")',
    'input[placeholder*="search" i]',
  ];

  for (const indicator of indicators) {
    const locator = page.locator(indicator).first();
    const isVisible = await locator.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      await page.waitForTimeout(500); // Additional wait for content to settle
      return true;
    }
  }

  return false;
}

/**
 * Ensure we're on the Servers tab
 */
export async function ensureServersTab(page: Page) {
  // First, check if we're already on the servers tab by looking for server manager content
  const serverManagerVisible = await waitForServerManager(page);
  
  if (serverManagerVisible) {
    return true; // Already on the right tab
  }

  // Look for sidebar navigation buttons
  // The tabs are rendered as buttons with text content
  const allButtons = page.locator('button');
  const buttonCount = await allButtons.count();
  
  let serversTabFound = false;
  for (let i = 0; i < buttonCount; i++) {
    const button = allButtons.nth(i);
    const text = await button.textContent().catch(() => '');
    const trimmedText = text?.trim() || '';
    
    // Check if this is the Servers tab (case-insensitive)
    if (trimmedText.toLowerCase() === 'servers') {
      // Check if it's in the sidebar (has icon or is in nav area)
      const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        await button.click();
        serversTabFound = true;
        await page.waitForTimeout(1500); // Wait for tab switch and content load
        break;
      }
    }
  }
  
  // If not found by text, try to find by icon or aria attributes
  if (!serversTabFound) {
    // Look for button with Server icon (lucide-react Server icon)
    const serverIconButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await serverIconButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await serverIconButton.click();
      await page.waitForTimeout(1500);
      serversTabFound = true;
    }
  }
  
  // Wait for server manager to load after tab click
  if (serversTabFound) {
    await waitForServerManager(page);
  }
  
  return serversTabFound;
}

/**
 * Wait for network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // If networkidle times out, just wait for domcontentloaded
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Wait for a specific element with retries
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  maxRetries = 3,
  timeout = 5000
) {
  for (let i = 0; i < maxRetries; i++) {
    const locator = page.locator(selector).first();
    const isVisible = await locator.isVisible({ timeout }).catch(() => false);
    if (isVisible) {
      return true;
    }
    await page.waitForTimeout(1000);
  }
  return false;
}

