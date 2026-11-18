import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const pageErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#start-screen').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('canvas').waitFor({ state: 'attached', timeout: 30000 });

  await page.locator('#start-button').click();
  await page.waitForFunction(
    () => !document.body.classList.contains('menu-active'),
  );
  await page.locator('#hud').waitFor({ state: 'visible' });

  await page.locator('#pause-btn').click();
  await page.locator('#pause-modal.is-visible').waitFor({ state: 'visible' });

  await page.locator('#resume-btn').click();
  await page.waitForFunction(
    () => !document.querySelector('#pause-modal').classList.contains('is-visible'),
  );

  assert.deepEqual(pageErrors, [], 'The game should not emit uncaught page errors');
  console.log('Browser smoke tests passed: title screen, game start, pause and resume.');
} finally {
  await browser.close();
}
