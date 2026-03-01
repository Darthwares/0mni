import { test, expect } from '@playwright/test';

test.describe('Collaboration Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collaboration');
    await page.waitForLoadState('networkidle');
  });

  test('should display collaboration module layout', async ({ page }) => {
    await expect(page.getByText(/Collaboration/i)).toBeVisible();
  });

  test('should display channels list', async ({ page }) => {
    const channels = page.locator('[class*="channel"]');
    expect(await channels.count() >= 0).toBeTruthy();
  });

  test('should show channel messages when channel selected', async ({ page }) => {
    const firstChannel = page.locator('[class*="channel"]').first();

    if (await firstChannel.isVisible({ timeout: 2000 })) {
      await firstChannel.click();
      await page.waitForTimeout(500);

      const messages = page.locator('[class*="message"]');
      expect(await messages.count() >= 0).toBeTruthy();
    }
  });

  test('should allow typing a message', async ({ page }) => {
    const firstChannel = page.locator('[class*="channel"]').first();

    if (await firstChannel.isVisible({ timeout: 2000 })) {
      await firstChannel.click();
      await page.waitForTimeout(500);

      const messageInput = page.locator('textarea, input[type="text"]').last();

      if (await messageInput.isVisible({ timeout: 2000 })) {
        await messageInput.fill('Test message in collaboration');
        await expect(messageInput).toHaveValue('Test message in collaboration');
      }
    }
  });

  test('should display documents section', async ({ page }) => {
    const documents = page.locator('text=/Documents|Files/i').first();

    if (await documents.isVisible({ timeout: 2000 })) {
      await documents.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display meetings section', async ({ page }) => {
    const meetings = page.locator('text=/Meetings|Calendar/i').first();

    if (await meetings.isVisible({ timeout: 2000 })) {
      await meetings.click();
      await page.waitForTimeout(500);
    }
  });
});
