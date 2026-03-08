import { test, expect } from './fixtures';

test.describe('Activity Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/activity');
  });

  test('renders the activity page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Activity/i }).first()).toBeVisible();
  });

  test('displays activity feed or empty state', async ({ page }) => {
    const noActivity = page.getByText(/no activity/i);
    const activityFeed = page.locator('[class*="card"]');
    expect(
      (await noActivity.isVisible().catch(() => false)) ||
      (await activityFeed.first().isVisible().catch(() => false))
    ).toBeTruthy();
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
