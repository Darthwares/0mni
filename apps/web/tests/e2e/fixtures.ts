import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Override page to add a helper that waits for the app shell to load
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options);
      // Wait for OIDC auth to hydrate and sidebar to render
      try {
        await page.waitForSelector('[data-slot="sidebar"]', { timeout: 20_000 });
      } catch {
        // If sidebar doesn't appear, the page might be redirecting to login
        // or still loading — wait a bit more
        await page.waitForLoadState('networkidle');
      }
      return response;
    };
    await use(page);
  },
});

export { expect };
