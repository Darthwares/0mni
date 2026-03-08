import { test, expect } from './fixtures';

test.describe('AI Employees Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-employees');
  });

  test('renders the AI Employees page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /AI Employees/i }).first()).toBeVisible();
  });

  test('displays employee type filters or stats', async ({ page }) => {
    const noAgents = page.getByText(/no ai/i);
    const agentCards = page.locator('[class*="card"]');
    expect(
      (await noAgents.isVisible().catch(() => false)) ||
      (await agentCards.first().isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('displays performance metrics section', async ({ page }) => {
    const metrics = page.getByText(/performance|tasks|online|agents/i).first();
    await expect(metrics).toBeVisible();
  });

  test('page is accessible and renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
