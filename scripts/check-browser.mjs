import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { tmpdir } from 'node:os';

// Exercise the production bundle at both a domain root and a nested static path.
const staticMode = process.argv.includes('--static');
let server, browser;
try {
  let url = process.env.MAP_TEST_URL || 'http://localhost:5173/';
  let rootUrl;
  if (staticMode) {
    const root = resolve('dist');
    server = createServer(async (req, res) => {
      let pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname.startsWith('/nested/map-demo/')) pathname = pathname.slice('/nested/map-demo'.length);
      const file = resolve(root, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      try {
        const bytes = await readFile(file);
        res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' })[extname(file)] || 'application/octet-stream');
        res.end(bytes);
      } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    rootUrl = `http://127.0.0.1:${server.address().port}/`;
    url = `${rootUrl}nested/map-demo/`;
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {
    if (response.url().startsWith(new URL(url).origin) && response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
  });
  await page.goto(url);
  await page.waitForFunction(() => Boolean(window.__watershed));
  assert.match(await page.locator('#distance').innerText(), /km|m/);
  await page.locator('#view2d').click();
  assert.equal(await page.locator('#view2d').getAttribute('aria-pressed'), 'true');
  await page.locator('#drop').click();
  const bounds = await page.locator('canvas').boundingBox();
  await page.mouse.click(bounds.x + bounds.width * .42, bounds.y + bounds.height * .45);
  assert.match(await page.locator('#trace-title').innerText(), /SELECTED/);
  await page.locator('#surface').selectOption('wetness');
  assert.equal(await page.locator('#legend-title').innerText(), 'WETNESS');
  assert.match(await page.locator('#selected-wetness').innerText(), /TWI \d/);
  assert.equal(await page.locator('#wetness-note').isVisible(), true);
  await page.locator('#flood').check();
  await page.waitForFunction(() => window.__watershed.waterLayers.state.result?.area > 0);
  await page.locator('#water-rise').fill('0');
  await page.waitForFunction(() => window.__watershed.waterLayers.state.result.area === 0);
  assert.match(await page.locator('#flood-note').innerText(), /No inundation/);
  await page.locator('#water-rise').fill('10');
  await page.waitForFunction(() => window.__watershed.waterLayers.state.result.area > 0);
  const before = await page.evaluate(() => ({ area: window.__watershed.waterLayers.state.result.area, seed: window.__watershed.waterLayers.state.seed }));
  await page.locator('#flood-source').click();
  await page.mouse.click(bounds.x + bounds.width * .56, bounds.y + bounds.height * .46);
  assert.notEqual(await page.evaluate(() => window.__watershed.waterLayers.state.seed), before.seed);
  assert.match(await page.locator('#flood-source-label').innerText(), /° N/);
  const stats = await page.evaluate(() => ({ area: window.__watershed.waterLayers.state.result.area, depth: window.__watershed.waterLayers.state.result.maxDepth }));
  await page.locator('#exaggeration').fill('2.3');
  assert.equal(await page.locator('#exaggeration-value').innerText(), '2.3×');
  assert.deepEqual(await page.evaluate(() => ({ area: window.__watershed.waterLayers.state.result.area, depth: window.__watershed.waterLayers.state.result.maxDepth })), stats);
  await page.locator('#view3d').click();
  await page.screenshot({ path: join(tmpdir(), 'watershed-water-desktop.png') });
  await page.locator('#flood-source').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#flood-source').evaluate(el => el.classList.contains('selecting')), false);
  await page.locator('#flood').uncheck();
  assert.equal(await page.locator('#flood-controls').isVisible(), false);
  await page.locator('#surface').selectOption('elevation');
  assert.equal(await page.locator('#legend-title').innerText(), 'ELEVATION');
  await page.locator('#network').uncheck();
  await page.locator('#animation').uncheck();
  await page.locator('#contours').uncheck();
  await page.locator('#reset').click();
  assert.match(await page.locator('#trace-title').innerText(), /YOUR LOCATION/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#flood').check();
  await page.locator('#surface').selectOption('wetness');
  await page.screenshot({ path: join(tmpdir(), 'watershed-water-mobile.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (rootUrl) {
    await page.goto(rootUrl);
    await page.waitForFunction(() => Boolean(window.__watershed));
    assert.match(await page.locator('#distance').innerText(), /km|m/);
  }
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: terrain, flow selection, wetness, inundation, source selection, dry state, exaggeration invariance, camera/layers, mobile layout' + (staticMode ? ', static root and subdirectory hosting.' : '.'));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
