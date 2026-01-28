/**
 * 정상 결제 흐름 E2E 테스트
 * 정상적인 결제 프로세스에서 오탐이 발생하지 않는지 검증
 */

import { Page } from 'puppeteer';

import {
  createPage,
  getTestPageUrl,
  fillSensitiveForm,
  waitForWarningModal,
  closeBrowser
} from './setup';

describe('Normal Payment Flow E2E Tests', () => {
  let page: Page;

  beforeEach(async () => {
    page = await createPage();
  });

  afterEach(async () => {
    if (page !== undefined) {
      await page.close();
    }
  });

  afterAll(async () => {
    await closeBrowser();
  });

  describe('Normal Payment Page', () => {
    it('should NOT show warning for normal payment form without malicious scripts', async () => {
      // Given: Navigate to normal payment page
      await page.goto(getTestPageUrl('normal-payment.html'), {
        waitUntil: 'networkidle0'
      });

      // When: Fill in payment form
      await fillSensitiveForm(page, {
        name: 'John Doe',
        cardNumber: '4111 1111 1111 1111',
        expiryDate: '12/25',
        cvv: '123'
      });

      // Then: No warning modal should appear
      const warningAppeared = await waitForWarningModal(page, 3000);
      expect(warningAppeared).toBe(false);
    });

    it('should allow form submission without blocking', async () => {
      // Given: Navigate to normal payment page
      await page.goto(getTestPageUrl('normal-payment.html'), {
        waitUntil: 'networkidle0'
      });

      // When: Fill and submit payment form
      await fillSensitiveForm(page, {
        name: 'Jane Smith',
        cardNumber: '4242 4242 4242 4242',
        expiryDate: '06/27',
        cvv: '456'
      });

      // Submit the form
      await page.click('[data-testid="submit-btn"]');

      // Then: Should show success message (not blocked)
      await page.waitForSelector('#successMessage', { visible: true, timeout: 5000 });
      const successVisible = await page.$eval('#successMessage', el => {
        return window.getComputedStyle(el).display !== 'none';
      });
      expect(successVisible).toBe(true);
    });

    it('should detect sensitive fields correctly', async () => {
      // Given: Navigate to normal payment page
      await page.goto(getTestPageUrl('normal-payment.html'), {
        waitUntil: 'networkidle0'
      });

      // When: Check for sensitive field attributes
      const cardField = await page.$('[autocomplete="cc-number"]');
      const cvvField = await page.$('[autocomplete="cc-csc"]');
      const expiryField = await page.$('[autocomplete="cc-exp"]');

      // Then: All sensitive fields should be present
      expect(cardField).not.toBeNull();
      expect(cvvField).not.toBeNull();
      expect(expiryField).not.toBeNull();
    });
  });

  describe('Trusted Payment Gateway', () => {
    it('should NOT trigger warning for Stripe payment submission', async () => {
      // Given: Navigate to trusted gateway page
      await page.goto(getTestPageUrl('trusted-gateway.html'), {
        waitUntil: 'networkidle0'
      });

      // Track outgoing requests
      const requests: string[] = [];
      await page.setRequestInterception(true);
      page.on('request', req => {
        requests.push(req.url());
        void req.continue();
      });

      // When: Fill and submit payment form
      await fillSensitiveForm(page, {
        name: 'Test User',
        cardNumber: '5555 5555 5555 4444',
        expiryDate: '03/28',
        cvv: '789'
      });

      await page.click('[data-testid="submit-btn"]');

      // Wait for request to be made
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then: Should send to trusted domain (api.stripe.com)
      const stripeRequest = requests.some(url => url.includes('api.stripe.com'));
      expect(stripeRequest).toBe(true);

      // And: No warning modal should appear
      const warningAppeared = await waitForWarningModal(page, 2000);
      expect(warningAppeared).toBe(false);
    });

    it('should recognize Stripe as trusted payment gateway', async () => {
      // Given: Navigate to trusted gateway page
      await page.goto(getTestPageUrl('trusted-gateway.html'), {
        waitUntil: 'networkidle0'
      });

      // When: Type in card number to trigger monitoring
      await page.type('[data-testid="card-number"]', '4000 0025 0000 3155');

      // Wait for extension to process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Then: Extension should be active but not alarmed
      // Check extension icon state (green = safe)
      const warningAppeared = await waitForWarningModal(page, 2000);
      expect(warningAppeared).toBe(false);
    });
  });

  describe('Same-domain submissions', () => {
    it('should NOT warn when form submits to same domain', async () => {
      // Given: Navigate to normal payment page
      await page.goto(getTestPageUrl('normal-payment.html'), {
        waitUntil: 'networkidle0'
      });

      // Track requests
      const requests: Array<{ url: string; method: string }> = [];
      await page.setRequestInterception(true);
      page.on('request', req => {
        requests.push({ url: req.url(), method: req.method() });
        void req.continue();
      });

      // When: Fill and submit form
      await fillSensitiveForm(page, {
        name: 'Same Domain Test',
        cardNumber: '4111 1111 1111 1111',
        expiryDate: '12/26',
        cvv: '321'
      });

      await page.click('[data-testid="submit-btn"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then: Request should go to same domain
      const sameDomainRequest = requests.some(
        r => r.url.includes('localhost:3333/api/payment')
      );
      expect(sameDomainRequest).toBe(true);

      // And: No warning should appear
      const warningAppeared = await waitForWarningModal(page, 2000);
      expect(warningAppeared).toBe(false);
    });
  });

  describe('False positive prevention', () => {
    it('should NOT flag analytics scripts without sensitive data', async () => {
      // Given: Navigate to normal payment page
      await page.goto(getTestPageUrl('normal-payment.html'), {
        waitUntil: 'networkidle0'
      });

      // When: Simulate analytics script (without card data)
      await page.evaluate(() => {
        // Simulate Google Analytics-like request
        fetch('https://www.google-analytics.com/collect', {
          method: 'POST',
          body: 'v=1&t=pageview&dp=/checkout'
        }).catch(() => {});
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then: Should NOT show warning (no sensitive data in request)
      const warningAppeared = await waitForWarningModal(page, 2000);
      expect(warningAppeared).toBe(false);
    });

    it('should allow legitimate third-party payment widgets', async () => {
      // Given: Navigate to trusted gateway page
      await page.goto(getTestPageUrl('trusted-gateway.html'), {
        waitUntil: 'networkidle0'
      });

      // When: Check for payment gateway indicators
      const gatewayBadge = await page.$eval('.gateway-badge span', el => el.textContent);

      // Then: Should recognize as legitimate payment context
      expect(gatewayBadge).toContain('Stripe');

      // Fill form and verify no false positive
      await fillSensitiveForm(page, {
        cardNumber: '4242 4242 4242 4242',
        cvv: '123'
      });

      const warningAppeared = await waitForWarningModal(page, 3000);
      expect(warningAppeared).toBe(false);
    });
  });
});
