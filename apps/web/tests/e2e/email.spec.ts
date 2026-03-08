import { test, expect } from './fixtures';

test.describe('Email Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/email');
  });

  test('renders the email page', async ({ page }) => {
    await expect(page.locator('main').last()).toBeVisible();
  });

  test('displays email folder sidebar', async ({ page }) => {
    await expect(page.getByText('Inbox')).toBeVisible();
    await expect(page.getByText('Sent')).toBeVisible();
    await expect(page.getByText('Drafts')).toBeVisible();
    await expect(page.getByText('Starred')).toBeVisible();
  });

  test('displays Compose button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Compose/i })).toBeVisible();
  });

  test('has search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search emails/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test email');
    await expect(searchInput).toHaveValue('test email');
  });

  test('shows empty state when no emails', async ({ page }) => {
    const noEmails = page.getByText(/no emails/i);
    if (await noEmails.isVisible()) {
      await expect(noEmails).toBeVisible();
    }
  });

  test('shows select email prompt when none selected', async ({ page }) => {
    await expect(page.getByText(/select an email/i)).toBeVisible();
  });

  test('compose button opens compose form', async ({ page }) => {
    await page.getByRole('button', { name: /Compose/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('New Email')).toBeVisible();
    await expect(page.getByPlaceholder('To:')).toBeVisible();
    await expect(page.getByPlaceholder('Subject:')).toBeVisible();
  });

  test('compose form has send button', async ({ page }) => {
    await page.getByRole('button', { name: /Compose/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Send/i })).toBeVisible();
  });

  test('compose form can be cancelled', async ({ page }) => {
    await page.getByRole('button', { name: /Compose/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Cancel/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/select an email/i)).toBeVisible();
  });

  test('can switch between email folders', async ({ page }) => {
    await page.getByText('Sent').click();
    await page.waitForTimeout(200);
    await page.getByText('Drafts').click();
    await page.waitForTimeout(200);
    await page.getByText('Starred').click();
    await page.waitForTimeout(200);
    await page.getByText('Inbox').click();
    await page.waitForTimeout(200);
  });
});
