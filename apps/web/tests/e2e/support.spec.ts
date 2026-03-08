import { test, expect } from './fixtures';

test.describe('Support Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support');
  });

  test('renders the support page', async ({ page }) => {
    await expect(page.locator('main').last()).toBeVisible();
  });

  test('displays ticket list panel', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('displays empty state or ticket list', async ({ page }) => {
    const noTickets = page.getByText(/no tickets/i);
    const ticketList = page.locator('[class*="border"]');
    expect(
      (await noTickets.isVisible().catch(() => false)) ||
      (await ticketList.first().isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('has search functionality for tickets', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });

  test('shows select prompt or empty state when no ticket selected', async ({ page }) => {
    // Either "select a ticket" or "no tickets" should be visible
    const selectPrompt = page.getByText(/select a ticket/i);
    const noTickets = page.getByText(/no tickets/i);
    expect(
      (await selectPrompt.isVisible().catch(() => false)) ||
      (await noTickets.isVisible().catch(() => false))
    ).toBeTruthy();
  });
});
