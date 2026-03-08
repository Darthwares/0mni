import { test, expect } from './fixtures';

test.describe('Engineering Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/engineering');
  });

  test('renders the engineering page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Engineering/i }).first()).toBeVisible();
  });

  test('displays tabs for PRs, Bugs, and Repositories', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Pull Requests/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Bugs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Repositories/i })).toBeVisible();
  });

  test('Pull Requests tab is active by default', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Pull Requests/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('displays PRs list or empty state', async ({ page }) => {
    const noPRs = page.getByText(/no pull requests/i);
    const table = page.locator('table');
    expect(
      (await noPRs.isVisible().catch(() => false)) ||
      (await table.isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('can switch to Bugs tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Bugs/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Bugs/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Repositories tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Repositories/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Repositories/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('has search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('fix bug');
      await expect(searchInput).toHaveValue('fix bug');
    }
  });
});
