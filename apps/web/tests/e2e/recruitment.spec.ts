import { test, expect } from './fixtures';

test.describe('Recruitment Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recruitment');
  });

  test('renders the recruitment page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Recruitment/i }).first()).toBeVisible();
  });

  test('displays tabs for Candidates, Job Postings, and Interviews', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Candidates/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Job Postings/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Interviews/i })).toBeVisible();
  });

  test('Candidates tab is active by default', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Candidates/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('displays candidates list or empty state', async ({ page }) => {
    const noCandidates = page.getByText(/no candidates/i);
    const table = page.locator('table');
    expect(
      (await noCandidates.isVisible().catch(() => false)) ||
      (await table.isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('can switch to Job Postings tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Job Postings/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Job Postings/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Interviews tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Interviews/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Interviews/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('has search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test candidate');
      await expect(searchInput).toHaveValue('test candidate');
    }
  });
});
