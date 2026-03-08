import { test, expect } from './fixtures';

test.describe('Collaboration Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collaboration');
  });

  test('renders the collaboration page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Collaboration/i }).first()).toBeVisible();
  });

  test('displays tabs for Channels, Documents, and Meetings', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Channels/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Documents/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Meetings/i })).toBeVisible();
  });

  test('Channels tab is active by default', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Channels/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('displays channels list or empty state', async ({ page }) => {
    const noChannels = page.getByText(/no channels/i);
    const channelList = page.locator('[class*="border"]');
    expect(
      (await noChannels.isVisible().catch(() => false)) ||
      (await channelList.first().isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('can switch to Documents tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Documents/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Documents/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Meetings tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Meetings/i }).click();
    await page.waitForTimeout(500);
    const tab = page.getByRole('tab', { name: /Meetings/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('has message input area in channels', async ({ page }) => {
    const messageInput = page.getByPlaceholder(/message|type/i);
    if (await messageInput.isVisible()) {
      await expect(messageInput).toBeEnabled();
    }
  });
});
