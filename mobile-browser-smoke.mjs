import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = process.env.MOBILE_SMOKE_URL || 'http://127.0.0.1:8000/';
const viewports = [
  { width: 390, height: 844, name: 'iphone-390' },
  { width: 430, height: 932, name: 'phone-430' },
];
const requiredTargets = [
  'overview','performance','portfolio','theses','risk','research',
  'model-governance','market-expectations','ai-optionality','philosophy'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
let failed = false;

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });

    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#overview.active-panel', { timeout: 30000 });
      await page.waitForSelector('[data-target="ai-optionality"]', { timeout: 30000 });
      await page.waitForTimeout(1500);

      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      assert(viewportMeta && viewportMeta.includes('width=device-width'), `${viewport.name}: missing responsive viewport meta`);

      const targets = await page.locator('.tab[data-target]').evaluateAll(nodes => nodes.map(n => n.dataset.target));
      for (const target of requiredTargets) {
        assert(targets.includes(target), `${viewport.name}: missing tab ${target}`);
      }

      for (const target of requiredTargets) {
        await page.locator(`.tab[data-target="${target}"]`).click();
        await page.waitForTimeout(120);
        const active = await page.locator('.panel.active-panel').getAttribute('id');
        assert(active === target, `${viewport.name}: clicking ${target} activated ${active}`);

        const overflow = await page.evaluate(() => ({
          root: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          inner: window.innerWidth,
        }));
        assert(overflow.root <= overflow.inner + 2, `${viewport.name}/${target}: root horizontal overflow ${overflow.root}px > ${overflow.inner}px`);
        assert(overflow.body <= overflow.inner + 2, `${viewport.name}/${target}: body horizontal overflow ${overflow.body}px > ${overflow.inner}px`);
      }

      await page.locator('.tab[data-target="overview"]').click();
      await page.waitForTimeout(250);
      const overviewCharts = page.locator('#overview .js-plotly-plot');
      assert(await overviewCharts.count() >= 2, `${viewport.name}: overview charts did not render`);

      const chartBounds = await page.locator('.active-panel .js-plotly-plot').evaluateAll(nodes =>
        nodes.map(n => {
          const r = n.getBoundingClientRect();
          return { width:r.width, left:r.left, right:r.right };
        })
      );
      for (const [i,b] of chartBounds.entries()) {
        assert(b.width > 100, `${viewport.name}: chart ${i} collapsed to ${b.width}px`);
        assert(b.left >= -2 && b.right <= viewport.width + 2, `${viewport.name}: chart ${i} escapes viewport (${b.left}, ${b.right})`);
      }

      const selectFont = await page.locator('#thesisCompanySelect').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      assert(selectFont >= 16, `${viewport.name}: thesis select is ${selectFont}px and may trigger iOS focus zoom`);

      await page.locator('.tab[data-target="ai-optionality"]').click();
      await page.waitForSelector('#aiCompany');
      const scenarioFont = await page.locator('.scenario-input').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      assert(scenarioFont >= 16, `${viewport.name}: scenario input is ${scenarioFont}px and may trigger iOS focus zoom`);

      const slider = page.locator('#aiExposure');
      await slider.fill('1.25');
      await page.waitForTimeout(100);
      const output = await page.locator('#aiExposureOut').textContent();
      assert(output && output.includes('1.25'), `${viewport.name}: AI optionality controls stopped responding`);

      await page.locator('.tab[data-target="performance"]').click();
      await page.waitForSelector('#shortTermPerformance-performance', { timeout: 15000 });
      const cards = await page.locator('#shortTermPerformance-performance .short-term-return-card').count();
      assert(cards >= 7, `${viewport.name}: short-term performance strip has only ${cards} cards`);

      assert(errors.length === 0, `${viewport.name}: browser errors: ${errors.join(' | ')}`);
      console.log(`PASS ${viewport.name}: tabs, charts, controls, overflow and performance strip`);
    } catch (err) {
      failed = true;
      await page.screenshot({ path: `mobile-smoke-${viewport.name}.png`, fullPage: true }).catch(() => {});
      console.error(`FAIL ${viewport.name}: ${err.stack || err}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failed) process.exit(1);
