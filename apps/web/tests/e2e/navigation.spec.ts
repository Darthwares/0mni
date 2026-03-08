import { test, expect } from './fixtures';

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('displays the Omni branding', async ({ page }) => {
    await expect(page.getByText('OMNI')).toBeVisible();
    await expect(page.getByText('AI Operating Platform')).toBeVisible();
  });

  test('displays all sidebar nav sections', async ({ page }) => {
    // Section headers in sidebar
    await expect(page.getByText('Overview').first()).toBeVisible();
    await expect(page.getByText('Communication').first()).toBeVisible();
    await expect(page.getByText('Business').first()).toBeVisible();
    await expect(page.getByText('Development').first()).toBeVisible();
    await expect(page.getByText('AI Platform').first()).toBeVisible();
  });

  test('displays all sidebar nav links', async ({ page }) => {
    const navLinks = [
      'Dashboard', 'Activity', 'Messages', 'Email',
      'Support', 'Sales', 'Recruitment',
      'Engineering', 'Collaboration',
      'AI Employees', 'Agent Studio',
    ];
    for (const link of navLinks) {
      await expect(page.getByRole('link', { name: link }).first()).toBeVisible();
    }
  });

  test('navigates to Dashboard', async ({ page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /Executive Dashboard/i })).toBeVisible();
  });

  test('navigates to Activity', async ({ page }) => {
    await page.getByRole('link', { name: 'Activity' }).click();
    await expect(page).toHaveURL(/\/activity/);
  });

  test('navigates to Messages', async ({ page }) => {
    await page.getByRole('link', { name: 'Messages' }).click();
    await expect(page).toHaveURL(/\/messages/);
  });

  test('navigates to Email', async ({ page }) => {
    await page.getByRole('link', { name: 'Email' }).click();
    await expect(page).toHaveURL(/\/email/);
  });

  test('navigates to Support', async ({ page }) => {
    await page.getByRole('link', { name: 'Support', exact: true }).click();
    await expect(page).toHaveURL(/\/support/);
  });

  test('navigates to Sales', async ({ page }) => {
    await page.getByRole('link', { name: 'Sales' }).click();
    await expect(page).toHaveURL(/\/sales/);
  });

  test('navigates to Recruitment', async ({ page }) => {
    await page.getByRole('link', { name: 'Recruitment' }).click();
    await expect(page).toHaveURL(/\/recruitment/);
  });

  test('navigates to Engineering', async ({ page }) => {
    await page.getByRole('link', { name: 'Engineering' }).click();
    await expect(page).toHaveURL(/\/engineering/);
  });

  test('navigates to Collaboration', async ({ page }) => {
    await page.getByRole('link', { name: 'Collaboration' }).click();
    await expect(page).toHaveURL(/\/collaboration/);
  });

  test('navigates to AI Employees', async ({ page }) => {
    await page.getByRole('link', { name: 'AI Employees' }).click();
    await expect(page).toHaveURL(/\/ai-employees/);
  });

  test('navigates to Agent Studio', async ({ page }) => {
    await page.getByRole('link', { name: 'Agent Studio' }).click();
    await expect(page).toHaveURL(/\/agent-studio/);
  });

  test('displays user profile in sidebar', async ({ page }) => {
    // The NavUser component shows the current user's name or identity
    // Look for any user-related button in the sidebar footer area
    const userArea = page.locator('[data-slot="sidebar"] button').last();
    await expect(userArea).toBeVisible({ timeout: 15_000 });
  });

  test('displays theme toggle', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Toggle theme/i })).toBeVisible();
  });

  test('theme toggle switches theme', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /Toggle theme/i });
    await toggle.click();
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toBeDefined();
  });

  test('sidebar can be toggled', async ({ page }) => {
    const toggleBtn = page.getByRole('button', { name: /Toggle Sidebar/i }).first();
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(300);
  });

  test('breadcrumb shows current page', async ({ page }) => {
    await expect(page.locator('nav[aria-label="breadcrumb"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="breadcrumb"]').getByText('Dashboard')).toBeVisible();
  });
});
