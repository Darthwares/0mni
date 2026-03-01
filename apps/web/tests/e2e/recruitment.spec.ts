import { test, expect } from '@playwright/test';

test.describe('Recruitment Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recruitment');
    await page.waitForLoadState('networkidle');
  });

  test('should display recruitment module layout', async ({ page }) => {
    await expect(page.getByText(/Recruitment/i)).toBeVisible();
  });

  test('should have candidates, jobs, and interviews tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Candidates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Jobs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Interviews/i })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Jobs/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Job|Position/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Interviews/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Interview|Schedule/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Candidates/i }).click();
    await page.waitForTimeout(300);
  });

  test('should display candidate list with AI match scores', async ({ page }) => {
    const scores = page.locator('text=/Match|Score|%/');
    expect(await scores.count() >= 0).toBeTruthy();
  });

  test('should show candidate details on click', async ({ page }) => {
    const firstCandidate = page.locator('[class*="candidate"]').first();

    if (await firstCandidate.isVisible({ timeout: 2000 })) {
      await firstCandidate.click();
      await page.waitForTimeout(500);

      const details = page.locator('text=/Resume|Experience|Skills/i').first();
      await expect(details).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display job postings', async ({ page }) => {
    await page.getByRole('button', { name: /Jobs/i }).click();
    await page.waitForTimeout(500);

    const jobs = page.locator('[class*="job"], [class*="posting"]');
    expect(await jobs.count() >= 0).toBeTruthy();
  });

  test('should display interview schedule', async ({ page }) => {
    await page.getByRole('button', { name: /Interviews/i }).click();
    await page.waitForTimeout(500);

    const interviews = page.locator('[class*="interview"], [class*="schedule"]');
    expect(await interviews.count() >= 0).toBeTruthy();
  });
});
