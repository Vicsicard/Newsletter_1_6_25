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

  test('should successfully submit onboarding form', async ({ page }) => {
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

  test('should validate form fields', async ({ page }) => {
    console.log('Starting validation test...');
    
    // Wait for form to be visible
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form', { state: 'visible' });
    
    // Test: Invalid Email Only
    console.log('Testing invalid email...');
    await page.locator('input[name="company_name"]').fill('Test Company');
    await page.locator('input[name="industry"]').fill('Technology');
    await page.locator('input[name="target_audience"]').fill('Small business owners');
    await page.locator('input[name="contact_email"]').fill('invalid-email');
    await page.locator('input[name="website_url"]').fill('any-website-format-is-ok'); // Should not cause validation error
    
    // Submit form
    await page.getByRole('button', { name: 'Generate Newsletter' }).click();
    
    // Check for email validation message only
    const errors = await page.locator('.text-red-600').allTextContents();
    console.log('Validation errors:', errors);
    expect(errors).toContain('Please enter a valid email address');
    expect(errors).not.toContain('Website URL');
  });

  test('should show validation errors for missing required fields', async ({ page }) => {
    console.log('Starting missing fields validation test...');
    
    // Wait for form to be visible
    await page.waitForSelector('form', { state: 'visible' });
    
    // Submit empty form
    const submitButton = await page.getByRole('button', { name: 'Generate Newsletter' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Wait for and check validation messages
    await page.waitForSelector('.text-red-600', { state: 'visible' });
    
    // Get all error messages
    const errorMessages = await page.locator('.text-red-600').allTextContents();
    expect(errorMessages).toContain('Company name is required');
    expect(errorMessages).toContain('Industry is required');
    expect(errorMessages).toContain('Contact email is required');
    expect(errorMessages).toContain('Target audience is required');
  });
});
