import { test, expect } from '@playwright/test';

test.describe('Onboarding Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    console.log('Navigating to homepage...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log('Page loaded');

    // Enable console log capture
    page.on('console', msg => {
      console.log(`Browser console: ${msg.type()}: ${msg.text()}`);
    });

    // Log network requests
    page.on('request', request => {
      console.log(`Network request: ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`Network response: ${response.status()} ${response.url()}`);
    });
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
    await page.waitForSelector('form', { state: 'visible' });
    
    // Fill in required fields
    console.log('Filling required fields...');
    await page.locator('input[name="company_name"]').click();
    await page.locator('input[name="company_name"]').fill('Test Company Inc.');
    await page.locator('input[name="company_name"]').press('Tab');
    
    await page.locator('input[name="industry"]').fill('Technology');
    await page.locator('input[name="industry"]').press('Tab');
    
    const testEmail = 'test@example.com';
    await page.locator('input[name="contact_email"]').fill(testEmail);
    await page.locator('input[name="contact_email"]').press('Tab');
    
    await page.locator('input[name="target_audience"]').fill('Small Business Owners');
    await page.locator('textarea[name="audience_description"]').fill('Entrepreneurs and small business owners looking to grow their online presence');
    
    // Fill in optional fields
    console.log('Filling optional fields...');
    await page.locator('input[name="website_url"]').fill('https://testcompany.com');
    
    // Take screenshot before submission
    console.log('Taking pre-submission screenshot...');
    await page.screenshot({ path: 'tests/screenshots/before-submit.png' });

    // Submit form
    console.log('Submitting form...');
    const submitButton = await page.getByRole('button', { name: 'Generate Newsletter' });
    await expect(submitButton).toBeVisible();
    
    // Click the submit button
    await submitButton.click();
    console.log('Form submitted');
    
    // Wait for first success modal
    console.log('Waiting for first success modal...');
    const expectedMessage = `Thank you for your submission! Your draft newsletter will be emailed to ${testEmail} within 36 hours. Please check your spam folder if you don't see it in your inbox.`;
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toContainText(expectedMessage, { timeout: 5000 });

    // Click the close button on the success modal
    console.log('Clicking close button on success modal...');
    const closeButton = dialog.getByRole('button');
    await closeButton.click();

    // Wait for the one-submission limit screen
    console.log('Waiting for one-submission limit screen...');
    await expect(page.getByText('Your newsletter is being generated')).toBeVisible();
    await expect(page.getByText('Only one newsletter submission is allowed per month')).toBeVisible();
    
    // Take screenshot after submission
    console.log('Taking post-submission screenshot...');
    await page.screenshot({ path: 'tests/screenshots/after-submit.png' });
  });
});
