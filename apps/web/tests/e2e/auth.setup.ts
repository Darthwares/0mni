import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup.setTimeout(120_000);
setup('authenticate', async ({ page }) => {
  // Check if we already have a valid auth state
  if (fs.existsSync(authFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      const oidcEntry = state.origins?.[0]?.localStorage?.find(
        (item: any) => item.name.startsWith('oidc.user:')
      );
      if (oidcEntry) {
        const user = JSON.parse(oidcEntry.value);
        const expiresAt = user.expires_at;
        // If token expires in more than 60 seconds, reuse it
        if (expiresAt && expiresAt > Date.now() / 1000 + 60) {
          return;
        }
      }
    } catch {
      // Invalid auth file, re-authenticate
    }
  }

  // Perform anonymous login via SpacetimeDB OIDC
  await page.goto('/login');

  // Wait for React hydration — the "Initializing..." text should disappear
  // once the OIDC provider mounts on the client side
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Initializing...'),
    { timeout: 30_000 }
  );

  // Wait for the login page to fully render
  await page.waitForSelector('text=Sign in with Google', { timeout: 30_000 });
  await page.click('text=Sign in with Google');
  await page.waitForURL(/auth\.spacetimedb\.com/, { timeout: 15_000 });

  // Click "Anonymous login"
  await page.click('text=Anonymous login');

  // Click "Allow" on the authorization screen
  await page.waitForSelector('text=Allow', { timeout: 10_000 });
  await page.click('text=Allow');

  // Wait for redirect back to the app
  await page.waitForURL(/localhost:3000/, { timeout: 15_000 });

  // If we land on the setup page, fill in profile
  if (page.url().includes('/setup')) {
    await page.fill('input[placeholder="Enter your full name"]', 'E2E Test User');
    await page.fill('input[placeholder="your.email@company.com"]', 'e2e@omni-test.com');
    await page.fill('input[placeholder*="Support Agent"]', 'QA Tester');
    await page.click('button:has-text("Continue to Dashboard")');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }

  // Wait for SpacetimeDB connection
  await page.waitForFunction(() => {
    return localStorage.getItem(
      Object.keys(localStorage).find((k) => k.startsWith('oidc.user:')) || ''
    ) !== null;
  }, { timeout: 10_000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
