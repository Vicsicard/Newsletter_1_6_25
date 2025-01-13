import { test, expect } from '@playwright/test';

test.describe('Onboarding Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    console.log('Navigating to homepage...');
    await page.goto('/');
  });

  test('should display onboarding form', async ({ page }) => {
    await expect(page.getByText('Welcome to Newsletter App')).toBeVisible();
    await expect(page.getByText('Company Information')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Newsletter' }).click();
    await expect(page.getByText('Company name is required')).toBeVisible();
    await expect(page.getByText('Industry is required')).toBeVisible();
    await expect(page.getByText('Contact email is required')).toBeVisible();
    await expect(page.getByText('Target audience is required')).toBeVisible();
  });

  test('should submit form successfully', async ({ page }) => {
    console.log('Starting form submission test...');
    
    // Wait for form to be visible
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form', { state: 'visible' });
    
    // Fill out form
    await page.locator('input[name="company_name"]').fill('Test Company');
    await page.locator('input[name="industry"]').fill('Technology');
    await page.locator('input[name="target_audience"]').fill('Small business owners');
    await page.locator('input[name="contact_email"]').fill('test@example.com');
    await page.locator('input[name="website_url"]').fill('https://testcompany.com');
    await page.locator('input[name="phone_number"]').fill('123-456-7890');
    
    // Take screenshot before submission
    console.log('Taking pre-submission screenshot...');
    await page.screenshot({ path: 'tests/screenshots/before-submit.png' });
    
    // Submit form
    const submitButton = await page.getByRole('button', { name: 'Generate Newsletter' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Wait for success message
    await page.waitForSelector('.text-green-600', { state: 'visible' });
    const successMessage = await page.locator('.text-green-600').textContent();
    expect(successMessage).toContain('Newsletter generation started');
    
    // Take screenshot after submission
    console.log('Taking post-submission screenshot...');
    await page.screenshot({ path: 'tests/screenshots/after-submit.png' });
  });
});
