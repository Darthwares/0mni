import { test, expect } from './fixtures';

test.describe('Agent Studio Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agent-studio');
  });

  test('renders the Agent Studio page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Agent Studio/i }).first()).toBeVisible();
  });

  test('displays agent templates or creation options', async ({ page }) => {
    const templates = page.getByText(/template|create|build/i).first();
    await expect(templates).toBeVisible();
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
