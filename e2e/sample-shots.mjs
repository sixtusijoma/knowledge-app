import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, devices } from 'playwright-core';

const APP = process.env.APP ?? 'http://127.0.0.1:44521';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'screenshots');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

const iphone = devices['iPhone 13'];
const phone = {
  ...iphone,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const leaks = [];

function watch(page) {
  page.on('request', (request) => {
    const host = hostOf(request.url());
    if (/supabase/i.test(host)) {
      leaks.push(host);
    }
  });
  page.on('pageerror', (error) => {
    console.log(`pageerror: ${error.message.split('\n')[0]}`);
  });
}

async function settle(page) {
  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(500);
}

async function openFeed(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('search-input').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="result-count"]');
    const text = node?.textContent ?? '';
    return text.includes('16 entries');
  }, { timeout: 30000 });
  const card = page.getByTestId('item-card').first();
  await card.waitFor();
  const label = (await card.getAttribute('aria-label')) ?? '';
  assert(label.includes('Sample article'), label);
  await settle(page);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
}

function encodeGif(webm, gif) {
  const encoded = spawnSync(
    'ffmpeg',
    [
      '-y',
      // Drop the blank document before the feed paints.
      '-ss',
      '0.45',
      '-i',
      webm,
      '-vf',
      'fps=10,scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
      '-loop',
      '0',
      gif,
    ],
    { encoding: 'utf8' },
  );
  if (encoded.status !== 0) {
    const tail = encoded.stderr ? encoded.stderr.slice(-400) : 'ffmpeg failed';
    throw new Error(tail);
  }
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

await mkdir(OUT, { recursive: true });

const context = await browser.newContext(phone);
const page = await context.newPage();
watch(page);

await openFeed(page);
await shot(page, 'feed.png');

await page.getByTestId('item-card').first().tap();
await page.getByTestId('detail-title').waitFor({ timeout: 20000 });
const title = await page.getByTestId('detail-title').innerText();
assert(title.includes('Sample article'), title);
const author = await page.getByTestId('detail-author').innerText();
assert(author === 'Sample Writer', author);
const link = await page.getByTestId('detail-link').innerText();
assert(link.startsWith('https://example.com/sample/'), link);
await settle(page);
await shot(page, 'entry.png');

await page.getByTestId('back-button').tap();
await page.getByTestId('feed-screen').waitFor();
await page.getByRole('tab', { name: 'Stats' }).tap();
await page.getByTestId('stats-total').waitFor({ timeout: 20000 });
await page.getByTestId('stats-activity-bookmarks').waitFor({ timeout: 20000 });
await page.getByText('Counts from the sample library.').waitFor();
const footnote = await page.getByTestId('stats-updated').innerText();
assert(footnote.includes('Sample rows only'), footnote);
const total = (await page.getByTestId('stats-total').innerText()).trim();
assert(total === '16', total);
await settle(page);
await shot(page, 'stats.png');

await page.getByTestId('stats-activity').evaluate((node) => {
  node.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(400);
const chartBucket = page.locator('[data-testid^="stats-activity-20"]').first();
await chartBucket.waitFor({ timeout: 10000 });
await settle(page);
await shot(page, 'stats-activity.png');

await context.close();

const videoDir = '/tmp/pw/sample-video';
await mkdir(videoDir, { recursive: true });
const videoContext = await browser.newContext({
  ...phone,
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
});
const videoPage = await videoContext.newPage();
watch(videoPage);
await openFeed(videoPage);
await videoPage.waitForTimeout(800);
await videoPage.getByTestId('item-card').first().tap();
await videoPage.getByTestId('detail-title').waitFor({ timeout: 20000 });
await videoPage.waitForTimeout(1100);
await videoPage.getByTestId('back-button').tap();
await videoPage.getByTestId('feed-screen').waitFor();
await videoPage.waitForTimeout(500);
await videoPage.getByRole('tab', { name: 'Stats' }).tap();
await videoPage.getByTestId('stats-activity-bookmarks').waitFor({ timeout: 20000 });
await videoPage.waitForTimeout(800);
await videoPage.getByTestId('stats-activity-week').tap();
await videoPage.waitForTimeout(700);
await videoPage.getByTestId('stats-activity').evaluate((node) => {
  node.scrollIntoView({ block: 'center' });
});
await videoPage.waitForTimeout(900);
const video = videoPage.video();
await videoContext.close();
encodeGif(await video.path(), path.join(OUT, 'demo.gif'));

await browser.close();
assert(leaks.length === 0, `unexpected Supabase host: ${[...new Set(leaks)].join(', ')}`);
console.log(`sample shots written to ${OUT}`);
