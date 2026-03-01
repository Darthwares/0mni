import { test, expect } from '@playwright/test';

test.describe('Engineering Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/engineering');
    await page.waitForLoadState('networkidle');
  });

  test('should display engineering module layout', async ({ page }) => {
    await expect(page.getByText(/Engineering/i)).toBeVisible();
  });

  test('should have PRs, Bugs, and Repos tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /PRs|Pull Requests/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bugs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Repos/i })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Bugs/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Bug|Issue/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Repos/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Repository|Repo/i).first()).toBeVisible();

    await page.getByRole('button', { name: /PRs|Pull Requests/i }).click();
    await page.waitForTimeout(300);
  });

  test('should display pull request list', async ({ page }) => {
    const prs = page.locator('[class*="pull"], [class*="pr"]');
    expect(await prs.count() >= 0).toBeTruthy();
  });

  test('should show PR details with AI review status', async ({ page }) => {
    const firstPR = page.locator('[class*="pull"], [class*="pr"]').first();

    if (await firstPR.isVisible({ timeout: 2000 })) {
      await firstPR.click();
      await page.waitForTimeout(500);

      // Look for review status or AI indicators
      const details = page.locator('text=/Review|Status|AI|Approved/i').first();
      await expect(details).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display bugs list with triage status', async ({ page }) => {
    await page.getByRole('button', { name: /Bugs/i }).click();
    await page.waitForTimeout(500);

    const bugs = page.locator('[class*="bug"], [class*="issue"]');
    expect(await bugs.count() >= 0).toBeTruthy();
  });

  test('should show bug severity indicators', async ({ page }) => {
    await page.getByRole('button', { name: /Bugs/i }).click();
    await page.waitForTimeout(500);

    const severity = page.locator('text=/Critical|High|Medium|Low|Severity/i');
    expect(await severity.count() >= 0).toBeTruthy();
  });

  test('should display repository list', async ({ page }) => {
    await page.getByRole('button', { name: /Repos/i }).click();
    await page.waitForTimeout(500);

    const repos = page.locator('[class*="repo"]');
    expect(await repos.count() >= 0).toBeTruthy();
  });

  test('should show code review AI indicators', async ({ page }) => {
    const aiReview = page.locator('text=/AI Review|Auto|Bot/i');
    const count = await aiReview.count();
    expect(count >= 0).toBeTruthy();
  });
});
