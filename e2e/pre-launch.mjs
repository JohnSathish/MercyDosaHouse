/**
 * Pre-launch test runner — PRODUCTION_READINESS.md §19
 * Records console events and API check results.
 *
 * Usage:
 *   node e2e/pre-launch.mjs
 *   SITE_URL=https://mercydosahouse.com API_URL=https://mercydosahouse.com/api/v1 node e2e/pre-launch.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';

const consoleEvents = [];

/** Capture browser/page console events during Playwright runs. */
export function recordConsoleEvents(page) {
  page.on('console', (msg) => {
    const entry = { type: msg.type(), text: msg.text(), ts: new Date().toISOString() };
    consoleEvents.push(entry);
    if (msg.type() === 'error') {
      console.warn(`[browser console.error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleEvents.push({ type: 'pageerror', text: err.message, ts: new Date().toISOString() });
    console.warn(`[browser pageerror] ${err.message}`);
  });
}

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'pass' });
    console.log(`✅ ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, status: 'fail', error: message });
    console.error(`❌ ${name}: ${message}`);
  }
}

async function fetchJson(url, options) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function runApiChecks() {
  await check('API health', async () => {
    const data = await fetchJson(`${API_URL}/health`);
    if (data.status !== 'ok' && data.status !== 'degraded') throw new Error('unhealthy');
  });

  await check('OTP status endpoint', async () => {
    await fetchJson(`${API_URL}/auth/otp/status`);
  });

  await check('Public products list', async () => {
    const data = await fetchJson(`${API_URL}/products?available=true&limit=5`);
    if (!data?.data?.length) throw new Error('no products');
  });

  await check('Marketing bundle', async () => {
    await fetchJson(`${API_URL}/marketing/public?platform=WEBSITE`);
  });

  await check('Business settings', async () => {
    await fetchJson(`${API_URL}/settings/business`);
  });

  await check('Order quote endpoint', async () => {
    const products = await fetchJson(`${API_URL}/products?available=true&limit=1`);
    const product = products.data[0];
    const quote = await fetchJson(`${API_URL}/orders/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
      }),
    });
    if (typeof quote.grandTotal !== 'number') throw new Error('missing grandTotal');
  });
}

async function runBrowserChecks() {
  let playwright;
  try {
    playwright = await import('@playwright/test');
  } catch {
    console.warn('⚠️  Playwright not installed — skipping browser checks. Run: pnpm add -D @playwright/test');
    return;
  }

  const { chromium } = playwright;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  recordConsoleEvents(page);

  await check('Website homepage loads', async () => {
    const res = await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
  });

  await check('Menu page loads', async () => {
    const res = await page.goto(`${SITE_URL}/menu`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
  });

  await check('Admin login page loads', async () => {
    const res = await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
  });

  await browser.close();
}

async function main() {
  console.log(`\nMercy Dosa House — Pre-Launch Tests`);
  console.log(`Site:  ${SITE_URL}`);
  console.log(`API:   ${API_URL}`);
  console.log(`Admin: ${ADMIN_URL}\n`);

  await runApiChecks();
  await runBrowserChecks();

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  const report = {
    timestamp: new Date().toISOString(),
    siteUrl: SITE_URL,
    apiUrl: API_URL,
    passed,
    failed,
    results,
    consoleEvents,
  };

  mkdirSync('e2e/reports', { recursive: true });
  const reportPath = join('e2e/reports', `pre-launch-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  console.log(`Report: ${reportPath}`);
  console.log(`Console events captured: ${consoleEvents.length}`);

  if (failed > 0) process.exit(1);
}

main();
