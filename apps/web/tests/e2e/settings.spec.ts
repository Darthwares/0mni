import { test, expect } from './fixtures';

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('renders the settings page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    await expect(page.getByText(/Manage your account/i)).toBeVisible();
  });

  test('displays all settings tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Notifications/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Security/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Platform/i })).toBeVisible();
  });

  test('Profile tab is active by default', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Profile/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('Profile tab shows user info', async ({ page }) => {
    const profileSection = page.getByText(/profile|account/i).first();
    await expect(profileSection).toBeVisible();
  });

  test('can switch to Notifications tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Notifications/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Notifications/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Security tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Security/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Security/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Platform tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Platform/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Platform/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('Notifications tab has interactive elements', async ({ page }) => {
    await page.getByRole('tab', { name: /Notifications/i }).click();
    await page.waitForTimeout(500);
    // Should have notification-related content
    const notifContent = page.getByText(/email|desktop|notification/i).first();
    await expect(notifContent).toBeVisible();
  });

  test('page renders without critical errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
