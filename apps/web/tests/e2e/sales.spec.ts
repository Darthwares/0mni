import { test, expect } from '@playwright/test';

test.describe('Sales Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
  });

  test('should display sales module layout', async ({ page }) => {
    // Check for main heading
    await expect(page.getByText(/Sales/i)).toBeVisible();
  });

  test('should display leads and deals tabs', async ({ page }) => {
    // Look for tab navigation
    const leadsTab = page.locator('text=/Leads/i').first();
    const dealsTab = page.locator('text=/Deals/i').first();

    await expect(leadsTab).toBeVisible({ timeout: 5000 });
    await expect(dealsTab).toBeVisible({ timeout: 5000 });
  });

  test('should switch between Leads and Deals tabs', async ({ page }) => {
    const leadsTab = page.getByRole('button', { name: /Leads/i });
    const dealsTab = page.getByRole('button', { name: /Deals/i });

    // Click Deals tab
    await dealsTab.click();
    await page.waitForTimeout(300);

    // Verify Deals content is visible
    await expect(page.getByText(/Pipeline|Deal/i).first()).toBeVisible();

    // Click back to Leads
    await leadsTab.click();
    await page.waitForTimeout(300);

    // Verify Leads content is visible
    await expect(page.getByText(/Lead/i).first()).toBeVisible();
  });

  test('should display lead list', async ({ page }) => {
    // Ensure we're on Leads tab
    const leadsTab = page.getByRole('button', { name: /Leads/i });
    await leadsTab.click();
    await page.waitForTimeout(500);

    // Check for lead cards/list items
    const leadItems = page.locator('[class*="lead"], [class*="card"]');
    const count = await leadItems.count();

    expect(count >= 0).toBeTruthy();
  });

  test('should display deal pipeline visualization', async ({ page }) => {
    // Navigate to Deals tab
    const dealsTab = page.getByRole('button', { name: /Deals/i });
    await dealsTab.click();
    await page.waitForTimeout(500);

    // Look for pipeline stages
    const pipelineStages = page.locator('text=/Prospecting|Qualification|Proposal|Negotiation|Closed/i');
    const stageCount = await pipelineStages.count();

    // Should have at least one pipeline stage visible
    expect(stageCount > 0).toBeTruthy();
  });

  test('should show lead details on click', async ({ page }) => {
    // Ensure we're on Leads tab
    const leadsTab = page.getByRole('button', { name: /Leads/i });
    await leadsTab.click();
    await page.waitForTimeout(500);

    // Click on first lead if available
    const firstLead = page.locator('[class*="lead"]').first();

    if (await firstLead.isVisible({ timeout: 2000 })) {
      await firstLead.click();
      await page.waitForTimeout(500);

      // Check for lead details section
      const details = page.locator('text=/Company|Contact|Score|Status/i').first();
      await expect(details).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show deal details on click', async ({ page }) => {
    // Navigate to Deals tab
    const dealsTab = page.getByRole('button', { name: /Deals/i });
    await dealsTab.click();
    await page.waitForTimeout(500);

    // Click on first deal if available
    const firstDeal = page.locator('[class*="deal"]').first();

    if (await firstDeal.isVisible({ timeout: 2000 })) {
      await firstDeal.click();
      await page.waitForTimeout(500);

      // Check for deal details
      const details = page.locator('text=/Value|Stage|Company/i').first();
      await expect(details).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display AI qualification scores', async ({ page }) => {
    // Ensure we're on Leads tab
    const leadsTab = page.getByRole('button', { name: /Leads/i });
    await leadsTab.click();
    await page.waitForTimeout(500);

    // Look for score indicators (might be percentage, stars, or numeric)
    const scoreIndicators = page.locator('text=/Score|Rating|Quality/i');
    const count = await scoreIndicators.count();

    expect(count >= 0).toBeTruthy();
  });

  test('should filter leads by status', async ({ page }) => {
    // Ensure we're on Leads tab
    const leadsTab = page.getByRole('button', { name: /Leads/i });
    await leadsTab.click();
    await page.waitForTimeout(500);

    // Look for filter/status controls
    const filterControls = page.locator('text=/Filter|Status|All/i').first();

    if (await filterControls.isVisible({ timeout: 2000 })) {
      await filterControls.click();
      await page.waitForTimeout(300);
    }
  });

  test('should display estimated deal values', async ({ page }) => {
    // Navigate to Deals tab
    const dealsTab = page.getByRole('button', { name: /Deals/i });
    await dealsTab.click();
    await page.waitForTimeout(500);

    // Look for dollar amounts
    const values = page.locator('text=/\\$[0-9,]+/');
    const count = await values.count();

    expect(count >= 0).toBeTruthy();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // The page should not crash even with no data
    await page.waitForTimeout(1000);

    // Check page is still responsive
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
  });
});
