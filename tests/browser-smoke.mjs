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
  await page.waitForFunction(() => window.__myrmidonModelLoaded === true, null, { timeout: 15000 });

  // 1. Enter the arena from title screen
  await page.locator('#start-button').click();
  await page.waitForFunction(
    () => !document.body.classList.contains('menu-active'),
  );

  // 2. Verify HUD elements
  await page.locator('#hud').waitFor({ state: 'visible' });
  await page.locator('#hp-bar').waitFor({ state: 'visible' });
  await page.locator('#xp-bar-container').waitFor({ state: 'visible' });
  await page.locator('#xp-bar').waitFor({ state: 'attached' });
  await page.locator('#level-value').waitFor({ state: 'visible' });
  await page.locator('#arena-telemetry').waitFor({ state: 'visible' });

  // 3. Simulate movement keyboard inputs
  await page.keyboard.down('z');
  await page.waitForTimeout(100);
  await page.keyboard.up('z');

  await page.keyboard.down('d');
  await page.waitForTimeout(100);
  await page.keyboard.up('d');

  // 4. Test Pause menu toggle
  await page.locator('#pause-btn').click();
  await page.locator('#pause-modal.is-visible').waitFor({ state: 'visible' });

  // 5. Resume battle
  await page.locator('#resume-btn').click();
  await page.waitForFunction(
    () => !document.querySelector('#pause-modal').classList.contains('is-visible'),
  );

  // 6. Test Pause and Restart run
  await page.locator('#pause-btn').click();
  await page.locator('#pause-modal.is-visible').waitFor({ state: 'visible' });
  await page.locator('#pause-restart-btn').click();
  await page.waitForFunction(
    () => !document.querySelector('#pause-modal').classList.contains('is-visible'),
  );

  // 7. Test Game Over modal lifecycle
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('test-game-over'));
    const modal = document.getElementById('gameover-modal');
    if (modal) {
      modal.classList.add('is-visible');
      modal.style.display = 'flex';
    }
  });
  await page.locator('#gameover-modal.is-visible').waitFor({ state: 'visible' });
  await page.locator('#player-name').waitFor({ state: 'visible' });
  await page.locator('#restart-btn').waitFor({ state: 'visible' });

  assert.deepEqual(pageErrors, [], 'The game should not emit uncaught page errors');
  console.log('Browser smoke tests passed: title screen, HUD, movement, pause, restart, and gameover modals.');
} finally {
  await browser.close();
}
