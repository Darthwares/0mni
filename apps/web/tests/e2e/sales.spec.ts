import { test, expect } from './fixtures';

test.describe('Sales Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
  });

  test('renders the sales page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Sales/i }).first()).toBeVisible();
  });

  test('displays tabs for Leads and Pipeline', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Leads/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Pipeline/i })).toBeVisible();
  });

  test('Leads tab is active by default', async ({ page }) => {
    const leadsTab = page.getByRole('tab', { name: /Leads/i });
    await expect(leadsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('displays leads table or empty state', async ({ page }) => {
    const noLeads = page.getByText(/no leads/i);
    const table = page.locator('table');
    expect(
      (await noLeads.isVisible().catch(() => false)) ||
      (await table.isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('can switch to Pipeline tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Pipeline/i }).click();
    await page.waitForTimeout(500);
    // Pipeline tab should now be active
    const pipelineTab = page.getByRole('tab', { name: /Pipeline/i });
    await expect(pipelineTab).toHaveAttribute('aria-selected', 'true');
  });

  test('has search functionality for leads', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test lead');
      await expect(searchInput).toHaveValue('test lead');
    }
  });
});
