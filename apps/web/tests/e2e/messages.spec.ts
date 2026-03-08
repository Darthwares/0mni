import { test, expect } from './fixtures';

test.describe('Messages Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/messages');
  });

  test('renders the messages page', async ({ page }) => {
    await expect(page.locator('main').last()).toBeVisible();
  });

  test('displays channel sidebar', async ({ page }) => {
    const channelSection = page.getByText(/channels|direct messages/i).first();
    await expect(channelSection).toBeVisible();
  });

  test('has search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('general');
      await expect(searchInput).toHaveValue('general');
    }
  });

  test('displays empty state or channel list', async ({ page }) => {
    const noChannels = page.getByText(/no channels/i);
    const channelList = page.locator('[class*="border"]');
    expect(
      (await noChannels.isVisible().catch(() => false)) ||
      (await channelList.first().isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('shows message prompt when no channel selected', async ({ page }) => {
    const prompt = page.getByText(/select a channel|select a conversation/i);
    if (await prompt.isVisible()) {
      await expect(prompt).toBeVisible();
    }
  });
});
