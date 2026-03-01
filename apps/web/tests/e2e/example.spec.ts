import { test, expect } from '@playwright/test';

test.describe('Omni Platform - Basic Navigation', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');

    // Wait for the dashboard to load
    await page.waitForLoadState('networkidle');

    // Check for dashboard heading
    await expect(page.getByRole('heading', { name: /Omni/i })).toBeVisible();
  });

  test('should navigate to Support module', async ({ page }) => {
    await page.goto('/');

    // Click on Support module card
    await page.click('a[href="/support"]');

    // Wait for Support page to load
    await page.waitForURL('/support');

    // Check for Support module heading
    await expect(page.getByText(/Support/i)).toBeVisible();
  });

  test('should navigate to Sales module', async ({ page }) => {
    await page.goto('/');

    // Click on Sales module card
    await page.click('a[href="/sales"]');

    // Wait for Sales page to load
    await page.waitForURL('/sales');

    // Check for Sales module heading
    await expect(page.getByText(/Sales/i)).toBeVisible();
  });

  test('should navigate to Recruitment module', async ({ page }) => {
    await page.goto('/');

    // Click on Recruitment module card
    await page.click('a[href="/recruitment"]');

    // Wait for Recruitment page to load
    await page.waitForURL('/recruitment');

    // Check for Recruitment module heading
    await expect(page.getByText(/Recruitment/i)).toBeVisible();
  });

  test('should navigate to Collaboration module', async ({ page }) => {
    await page.goto('/');

    // Click on Collaboration module card
    await page.click('a[href="/collaboration"]');

    // Wait for Collaboration page to load
    await page.waitForURL('/collaboration');

    // Check for Collaboration module heading
    await expect(page.getByText(/Collaboration/i)).toBeVisible();
  });

  test('should navigate to Engineering module', async ({ page }) => {
    await page.goto('/');

    // Click on Engineering module card
    await page.click('a[href="/engineering"]');

    // Wait for Engineering page to load
    await page.waitForURL('/engineering');

    // Check for Engineering module heading
    await expect(page.getByText(/Engineering/i)).toBeVisible();
  });

  test('should display SpacetimeDB connection status', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for connection indicator
    // This will show as connected or disconnected depending on SpacetimeDB availability
    const connectionStatus = page.locator('text=/Connected|Disconnected/i');
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });
  });
});
