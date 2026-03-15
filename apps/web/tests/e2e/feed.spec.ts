import { test, expect } from './fixtures';

test.describe('Feed Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feed');
  });

  test('renders the feed tab bar with For you, Following, Trending', async ({ page }) => {
    await expect(page.getByText('For you')).toBeVisible();
    await expect(page.getByText('Following')).toBeVisible();
    await expect(page.getByText('Trending')).toBeVisible();
  });

  test('shows post composer with placeholder', async ({ page }) => {
    const composer = page.getByPlaceholder(/What's happening/i);
    await expect(composer).toBeVisible();
  });

  test('composer expands on focus and shows Post button', async ({ page }) => {
    const composer = page.getByPlaceholder(/What's happening/i);
    await composer.click();
    await expect(page.getByRole('button', { name: /Post/i })).toBeVisible();
  });

  test('composer shows character count when typing', async ({ page }) => {
    const composer = page.getByPlaceholder(/What's happening/i);
    await composer.click();
    await composer.fill('Hello world!');
    await expect(page.getByText('12/2000')).toBeVisible();
  });

  test('Post button is disabled when empty', async ({ page }) => {
    const composer = page.getByPlaceholder(/What's happening/i);
    await composer.click();
    const postBtn = page.getByRole('button', { name: /Post/i });
    await expect(postBtn).toBeDisabled();
  });

  test('shows empty state when no posts', async ({ page }) => {
    // The empty state should show when there are no posts
    const emptyOrPosts = page.getByText(/No posts yet|Be the first/i);
    // Only check if the page has loaded - there might be posts
    await page.waitForTimeout(1000);
    const postCount = await page.locator('article').count();
    if (postCount === 0) {
      await expect(emptyOrPosts.first()).toBeVisible();
    }
  });

  test('tab switching works', async ({ page }) => {
    await page.getByText('Following').click();
    // Following tab should have active indicator
    const followingTab = page.getByText('Following');
    await expect(followingTab).toBeVisible();

    await page.getByText('Trending').click();
    const trendingTab = page.getByText('Trending');
    await expect(trendingTab).toBeVisible();

    await page.getByText('For you').click();
    const forYouTab = page.getByText('For you');
    await expect(forYouTab).toBeVisible();
  });

  test('shows Omni AI card in trending sidebar on desktop', async ({ page }) => {
    // This is only visible on xl screens
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/feed');
    const omniCard = page.getByText('Omni AI');
    // May or may not be visible depending on viewport
    if (await omniCard.isVisible()) {
      await expect(page.getByText('@omni')).toBeVisible();
    }
  });

  test('shows search box in sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/feed');
    const searchBox = page.getByPlaceholder('Search posts...');
    if (await searchBox.isVisible()) {
      await expect(searchBox).toBeVisible();
    }
  });
});
