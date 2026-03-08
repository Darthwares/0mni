import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('renders the executive dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Executive Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Real-time overview/i)).toBeVisible();
  });

  test('displays KPI cards', async ({ page }) => {
    await expect(page.getByText('Open Tickets')).toBeVisible();
    await expect(page.getByText('Active Leads')).toBeVisible();
    await expect(page.getByText('Active Candidates')).toBeVisible();
    await expect(page.getByText('Pending Tasks')).toBeVisible();
  });

  test('KPI cards link to correct pages', async ({ page }) => {
    const supportLink = page.locator('a[href="/support"]').first();
    await expect(supportLink).toBeVisible();

    const salesLink = page.locator('a[href="/sales"]').first();
    await expect(salesLink).toBeVisible();

    const recruitmentLink = page.locator('a[href="/recruitment"]').first();
    await expect(recruitmentLink).toBeVisible();
  });

  test('displays AI Performance section', async ({ page }) => {
    await expect(page.getByText('AI Performance')).toBeVisible();
    await expect(page.getByText('AI Task Share')).toBeVisible();
    await expect(page.getByText('Avg AI Confidence')).toBeVisible();
  });

  test('displays AI agent stats', async ({ page }) => {
    // These are inside the AI Performance card - may need scrolling
    const aiAgents = page.getByText('AI Agents').first();
    const apiCost = page.getByText('API Cost').first();
    await aiAgents.scrollIntoViewIfNeeded();
    await expect(aiAgents).toBeVisible();
    await expect(apiCost).toBeVisible();
  });

  test('displays Quick Actions section', async ({ page }) => {
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByText('Create Support Ticket')).toBeVisible();
    await expect(page.getByText('Add Lead')).toBeVisible();
  });

  test('displays AI Employees section', async ({ page }) => {
    const section = page.getByText('AI Employees').first();
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  });

  test('displays Recent Activity section', async ({ page }) => {
    const section = page.getByText('Recent Activity');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  });

  test('displays Task Pipeline section', async ({ page }) => {
    const pipeline = page.getByText('Task Pipeline');
    await pipeline.scrollIntoViewIfNeeded();
    await expect(pipeline).toBeVisible();
    await expect(page.getByText('Unclaimed')).toBeVisible();
  });

  test('displays Ticket Overview section', async ({ page }) => {
    const overview = page.getByText('Ticket Overview');
    await overview.scrollIntoViewIfNeeded();
    await expect(overview).toBeVisible();
  });

  test('quick action links navigate correctly', async ({ page }) => {
    await page.getByText('Create Support Ticket').click();
    await page.waitForURL(/\/support/);
    expect(page.url()).toContain('/support');
  });
});
