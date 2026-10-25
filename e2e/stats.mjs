import { chromium, devices } from 'playwright-core';
import { mkdir, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const APP = process.env.APP ?? 'http://127.0.0.1:44521';
const OUT = '/opt/cursor/artifacts';
const ANON =
  'your-supabase-anon-key';
const REST = 'https://your-project.supabase.co/rest/v1/items';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const iphone = devices['iPhone 13'];
const phone = {
  ...iphone,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function num(text) {
  const value = Number(String(text).replace(/[^0-9-]/g, ''));
  assert(Number.isFinite(value), `not a number: ${text}`);
  return value;
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function pretty(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function rangeText(from, to) {
  if (from && to) {
    return `${pretty(from)} – ${pretty(to)}`;
  }
  if (from) {
    return `From ${pretty(from)}`;
  }
  return `Until ${pretty(to)}`;
}

function presetWindow(preset, now) {
  const to = isoDate(now);
  if (preset === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to };
  }
  let days = 89;
  if (preset === '7') {
    days = 6;
  } else if (preset === '30') {
    days = 29;
  }
  return { from: isoDate(addDays(now, -days)), to };
}

function share(part, total) {
  if (total <= 0) {
    return '0.0';
  }
  return ((part / total) * 100).toFixed(1);
}

function parseTip(text) {
  const match = /^(.+) · ([\d,]+) entr(?:y|ies) · (\d+\.\d)%$/.exec(text);
  assert(match, `tooltip: ${text}`);
  return { label: match[1], count: num(match[2]), share: match[3] };
}

async function restCount(params) {
  const url = new URL(REST);
  url.searchParams.set('select', 'id');
  for (const [key, value] of params) {
    url.searchParams.append(key, value);
  }
  const response = await fetch(url, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!response.ok && response.status !== 206) {
    throw new Error(`REST ${response.status} ${url.search}: ${await response.text()}`);
  }
  const total = Number((response.headers.get('content-range') ?? '').split('/')[1]);
  assert(Number.isFinite(total), `bad content-range for ${url.search}`);
  return total;
}

async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail: detail ?? '' });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).split('\n')[0].slice(0, 400);
    results.push({ name, ok: false, detail: message });
    console.log(`FAIL  ${name} — ${message}`);
    if (current) {
      await current.screenshot({ path: `${OUT}/stats_fail_${results.length}.png` }).catch(() => undefined);
    }
  }
}

let current = null;

async function textOf(locator) {
  await locator.waitFor({ state: 'visible', timeout: 25000 });
  return (await locator.innerText()).replace(/\s+/g, ' ').trim();
}

async function reveal(locator) {
  await locator.evaluate((node) => {
    node.scrollIntoView({ block: 'center', inline: 'center' });
  });
}

async function tap(locator) {
  await reveal(locator);
  await locator.tap({ timeout: 10000 });
}

async function longPress(page, locator) {
  await reveal(locator);
  const box = await locator.boundingBox();
  assert(box, 'nothing to long-press');
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 24);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(700);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

async function scrollStats(page, top) {
  await page.getByTestId('stats-screen').evaluate((node, y) => {
    const seen = new Set();
    const queue = [node];
    while (queue.length > 0) {
      const el = queue.shift();
      if (!el || seen.has(el)) {
        continue;
      }
      seen.add(el);
      if (el.scrollHeight > el.clientHeight + 8) {
        el.scrollTop = y;
      }
      for (const child of el.children) {
        queue.push(child);
      }
    }
  }, top);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function openStats(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('search-input').waitFor({ timeout: 60000 });
  await tap(page.getByRole('tab', { name: 'Stats' }));
  await page.getByTestId('stats-total').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="stats-total"]');
    return node && /\d/.test(node.textContent || '');
  });
}

async function clearStats(page) {
  const clear = page.getByTestId('stats-clear');
  if ((await clear.count()) > 0) {
    await tap(clear);
  }
}

async function uiTotal(page) {
  return num(await textOf(page.getByTestId('stats-total')));
}

async function ariaCount(locator) {
  const label = await locator.getAttribute('aria-label');
  const match = /([\d,]+) entr/.exec(label ?? '');
  assert(match, `aria-label: ${label}`);
  return num(match[1]);
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

await mkdir(OUT, { recursive: true });
await mkdir('/tmp/pw/stats-video', { recursive: true });

const context = await browser.newContext(phone);
const page = await context.newPage();
current = page;
const consoleErrors = [];
page.on('pageerror', (error) => {
  consoleErrors.push(error.message);
});
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});

const now = new Date();
const library = await restCount([]);

await check('phone profile is touch and mobile', async () => {
  assert(phone.hasTouch === true, 'hasTouch');
  assert(phone.isMobile === true, 'isMobile');
  assert(phone.viewport.width === 390 && phone.viewport.height === 844, 'viewport');
  return 'iPhone 13 profile, 390×844, hasTouch, isMobile';
});

await openStats(page);

await check('unfiltered totals match Supabase', async () => {
  const total = await uiTotal(page);
  const x = num(await textOf(page.getByTestId('stats-x')));
  const grok = num(await textOf(page.getByTestId('stats-grok')));
  const high = num(await textOf(page.getByTestId('stats-importance-high')));
  const medium = num(await textOf(page.getByTestId('stats-importance-medium')));
  const low = num(await textOf(page.getByTestId('stats-importance-low')));
  const coding = num(await textOf(page.getByTestId('stats-topic-Coding')));
  const october = await ariaCount(page.getByTestId('stats-month-2026-10'));
  assert(total === library, `total ${total} vs ${library}`);
  assert(x === (await restCount([['source', 'eq.X Bookmark']])), `x ${x}`);
  assert(grok === (await restCount([['source', 'eq.Grok Chat']])), `grok ${grok}`);
  assert(x + grok === total, 'sources do not add up');
  assert(high === (await restCount([['importance', 'eq.High']])), `high ${high}`);
  assert(medium === (await restCount([['importance', 'eq.Medium']])), `medium ${medium}`);
  assert(low === (await restCount([['importance', 'eq.Low']])), `low ${low}`);
  assert(coding === (await restCount([['topics', 'ov.{"Coding"}']])), `coding ${coding}`);
  assert(
    october ===
      (await restCount([
        ['item_date', 'gte.2026-10-01'],
        ['item_date', 'lte.2026-10-31'],
      ])),
    `october ${october}`,
  );
  return `${total} entries, X ${x}, Grok ${grok}, October ${october}`;
});

await check('long-press shows the count without selecting', async () => {
  const before = await uiTotal(page);
  const coding = num(await textOf(page.getByTestId('stats-topic-Coding')));
  await longPress(page, page.getByTestId('stats-topic-bar-Coding'));
  await page.getByTestId('stats-tooltip').waitFor({ timeout: 5000 });
  const tip = parseTip(await textOf(page.getByTestId('stats-tooltip')));
  assert(tip.label === 'Coding', tip.label);
  assert(tip.count === coding, `${tip.count} vs ${coding}`);
  assert(tip.share === share(coding, before), `${tip.share} vs ${share(coding, before)}`);
  assert((await page.getByTestId('stats-chip-topic').count()) === 0, 'long-press selected a topic');
  assert((await uiTotal(page)) === before, 'long-press changed the total');
  await scrollStats(page, 0);
  await shot(page, 'stats_tooltip_dark');
  return tip.count + ' · ' + tip.share + '%';
});

await check('tapping a source cross-filters the other charts', async () => {
  const xRest = await restCount([['source', 'eq.X Bookmark']]);
  const sourceBefore = num(await textOf(page.getByTestId('stats-source-x-count')));
  await tap(page.getByTestId('stats-source-x'));
  await page.getByTestId('stats-chip-source').waitFor();
  const total = await uiTotal(page);
  const tileX = num(await textOf(page.getByTestId('stats-x')));
  const tileGrok = num(await textOf(page.getByTestId('stats-grok')));
  const sourceAfter = num(await textOf(page.getByTestId('stats-source-x-count')));
  const grokOnChart = num(await textOf(page.getByTestId('stats-source-grok-count')));
  const high = num(await textOf(page.getByTestId('stats-importance-high')));
  const coding = num(await textOf(page.getByTestId('stats-topic-Coding')));
  const october = await ariaCount(page.getByTestId('stats-month-2026-10'));
  assert(total === xRest, `total ${total} vs ${xRest}`);
  assert(tileX === xRest && tileGrok === 0, `tiles ${tileX}/${tileGrok}`);
  assert(sourceAfter === sourceBefore, 'source chart filtered itself');
  assert(grokOnChart === library - xRest, 'grok segment disappeared');
  assert(high === (await restCount([['source', 'eq.X Bookmark'], ['importance', 'eq.High']])), `high ${high}`);
  assert(coding === (await restCount([['source', 'eq.X Bookmark'], ['topics', 'ov.{"Coding"}']])), `coding ${coding}`);
  assert(
    october ===
      (await restCount([
        ['source', 'eq.X Bookmark'],
        ['item_date', 'gte.2026-10-01'],
        ['item_date', 'lte.2026-10-31'],
      ])),
    `october ${october}`,
  );
  assert((await textOf(page.getByTestId('stats-chip-source'))) === 'X Bookmarks', 'chip');
  assert((await page.getByTestId('stats-cross-note').count()) === 1, 'missing cross note');
  const tip = parseTip(await textOf(page.getByTestId('stats-tooltip')));
  assert(tip.count === xRest, `tooltip ${tip.count}`);
  assert(tip.share === share(xRest, library), tip.share);
  return `X ${total}; chart still shows both sources`;
});

await check('tapping the same source again clears it', async () => {
  await tap(page.getByTestId('stats-source-x'));
  assert((await page.getByTestId('stats-chip-source').count()) === 0, 'chip stayed');
  assert((await uiTotal(page)) === library, 'total did not return');
  return 'back to ' + library;
});

await check('tapping the importance donut selects that slice', async () => {
  const high = num(await textOf(page.getByTestId('stats-importance-high')));
  const medium = num(await textOf(page.getByTestId('stats-importance-medium')));
  const low = num(await textOf(page.getByTestId('stats-importance-low')));
  const totalSlices = high + medium + low;
  const donut = page.getByTestId('stats-donut');
  await reveal(donut);
  const box = await donut.boundingBox();
  assert(box, 'donut missing');
  const mid = high / totalSlices / 2;
  const angle = (mid - 0.25) * Math.PI * 2;
  const radius = (box.width * (132 - 16)) / 2 / 132;
  const x = box.x + box.width / 2 + radius * Math.cos(angle);
  const y = box.y + box.height / 2 + radius * Math.sin(angle);
  await page.touchscreen.tap(x, y);
  await page.getByTestId('stats-chip-importance').waitFor({ timeout: 5000 });
  const chip = await textOf(page.getByTestId('stats-chip-importance'));
  assert(chip === 'High', `donut tap selected ${chip}`);
  const total = await uiTotal(page);
  const highRest = await restCount([['importance', 'eq.High']]);
  assert(total === highRest, `${total} vs ${highRest}`);
  assert(num(await textOf(page.getByTestId('stats-importance-high'))) === high, 'donut filtered itself');
  const tip = parseTip(await textOf(page.getByTestId('stats-tooltip')));
  assert(tip.label === 'High' && tip.count === high, tip.label + ' ' + tip.count);
  assert(tip.share === share(high, totalSlices), tip.share);
  return `High ${total} via the ring`;
});

await check('a second topic replaces the first', async () => {
  await clearStats(page);
  await tap(page.getByTestId('stats-topic-bar-Coding'));
  assert((await textOf(page.getByTestId('stats-chip-topic'))) === 'Coding', 'coding chip');
  const codingTotal = await uiTotal(page);
  assert(codingTotal === (await restCount([['topics', 'ov.{"Coding"}']])), `coding ${codingTotal}`);
  await tap(page.getByTestId('stats-topic-bar-Cursor'));
  assert((await textOf(page.getByTestId('stats-chip-topic'))) === 'Cursor', 'did not replace');
  assert((await page.getByTestId('stats-chip-topic').count()) === 1, 'two topic chips');
  const cursorTotal = await uiTotal(page);
  assert(cursorTotal === (await restCount([['topics', 'ov.{"Cursor"}']])), `cursor ${cursorTotal}`);
  await tap(page.getByTestId('stats-topic-bar-Cursor'));
  assert((await page.getByTestId('stats-chip-topic').count()) === 0, 'cursor stayed selected');
  return `Coding ${codingTotal}, Cursor ${cursorTotal}`;
});

await check('source, topic, and month stack, then See entries', async () => {
  await clearStats(page);
  await tap(page.getByTestId('stats-source-grok'));
  await tap(page.getByTestId('stats-topic-bar-AI/Agents'));
  await reveal(page.getByTestId('stats-month-2026-10'));
  await tap(page.getByTestId('stats-month-2026-10'));
  const params = [
    ['source', 'eq.Grok Chat'],
    ['topics', 'ov.{"AI/Agents"}'],
    ['item_date', 'gte.2026-10-01'],
    ['item_date', 'lte.2026-10-31'],
  ];
  const expected = await restCount(params);
  const total = await uiTotal(page);
  assert(total === expected, `${total} vs ${expected}`);
  assert((await textOf(page.getByTestId('stats-chip-source'))) === 'Grok Chats', 'source chip');
  assert((await textOf(page.getByTestId('stats-chip-topic'))) === 'AI/Agents', 'topic chip');
  assert((await textOf(page.getByTestId('stats-chip-month'))) === 'October 2026', 'month chip');
  const agentsOnX = num(await textOf(page.getByTestId('stats-topic-AI/Agents')));
  assert(
    agentsOnX ===
      (await restCount([
        ['source', 'eq.Grok Chat'],
        ['item_date', 'gte.2026-10-01'],
        ['item_date', 'lte.2026-10-31'],
        ['topics', 'ov.{"AI/Agents"}'],
      ])),
    'topic chart changed its own bar',
  );
  await scrollStats(page, 0);
  await shot(page, 'stats_crossfilter_dark');
  await reveal(page.getByTestId('stats-donut'));
  await shot(page, 'stats_importance_dark');
  await tap(page.getByTestId('stats-see-entries'));
  await page.getByTestId('search-input').waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="result-count"]');
    return node && /^\d/.test(node.textContent || '');
  });
  const feedCount = num(await textOf(page.getByTestId('result-count')));
  assert(feedCount === expected, `feed ${feedCount} vs ${expected}`);
  assert((await textOf(page.getByTestId('chip-source'))) === 'Grok Chats', 'feed source');
  assert((await textOf(page.getByTestId('chip-topic-AI/Agents'))) === 'AI/Agents', 'feed topic');
  assert((await textOf(page.getByTestId('chip-month'))) === 'October 2026', 'feed month');
  assert((await page.getByTestId('search-input').inputValue()) === '', 'search was not cleared');
  await shot(page, 'feed_from_stats_dark');
  return `${expected} entries on the feed`;
});

await check('removing one chip widens just that dimension', async () => {
  await tap(page.getByRole('tab', { name: 'Stats' }));
  await page.getByTestId('stats-chip-topic').waitFor();
  await tap(page.getByTestId('stats-chip-topic'));
  const expected = await restCount([
    ['source', 'eq.Grok Chat'],
    ['item_date', 'gte.2026-10-01'],
    ['item_date', 'lte.2026-10-31'],
  ]);
  assert((await uiTotal(page)) === expected, 'total after removing topic');
  assert((await page.getByTestId('stats-chip-source').count()) === 1, 'source chip gone');
  assert((await page.getByTestId('stats-chip-month').count()) === 1, 'month chip gone');
  return `Grok in October ${expected}`;
});

await check('Clear all restores the library', async () => {
  await tap(page.getByTestId('stats-clear'));
  assert((await page.getByTestId('stats-clear').count()) === 0, 'clear stayed');
  assert((await uiTotal(page)) === library, 'total');
  return String(library);
});

for (const preset of ['7', '30', '90', 'year']) {
  await check(`date preset ${preset} matches Supabase`, async () => {
    await tap(page.getByTestId(`stats-range-${preset}`));
    const window = presetWindow(preset, now);
    const label = await page.getByTestId('stats-range-label').getAttribute('aria-label');
    assert(label === `${window.from}..${window.to}`, `${label} vs ${window.from}..${window.to}`);
    const expected = await restCount([
      ['item_date', 'gte.' + window.from],
      ['item_date', 'lte.' + window.to],
    ]);
    assert((await uiTotal(page)) === expected, `total vs ${expected}`);
    const chipId = preset === '7' ? 'Last 7 days' : preset === '30' ? 'Last 30 days' : preset === '90' ? 'Last 90 days' : 'This year';
    assert((await textOf(page.getByTestId('stats-chip-range'))) === chipId, 'range chip');
    if (preset === '30') {
      await scrollStats(page, 0);
      await shot(page, 'stats_range_dark');
    }
    return `${window.from}..${window.to} = ${expected}`;
  });
}

await check('custom range filters every chart', async () => {
  await tap(page.getByTestId('stats-range-custom'));
  await page.getByTestId('stats-from').fill('2026-10-01');
  await page.getByTestId('stats-to').fill('2026-10-15');
  const label = await page.getByTestId('stats-range-label').getAttribute('aria-label');
  assert(label === '2026-10-01..2026-10-15', label ?? '');
  const expected = await restCount([
    ['item_date', 'gte.2026-10-01'],
    ['item_date', 'lte.2026-10-15'],
  ]);
  assert((await uiTotal(page)) === expected, `${await uiTotal(page)} vs ${expected}`);
  await scrollStats(page, 0);
  await shot(page, 'stats_custom_dark');
  return `${expected} entries`;
});

await check('an impossible custom range shows the hint and does not filter', async () => {
  await page.getByTestId('stats-from').fill('2026-02-31');
  await page.getByTestId('stats-range-hint').waitFor();
  const hint = await textOf(page.getByTestId('stats-range-hint'));
  assert(hint.includes('YYYY-MM-DD'), hint);
  assert((await uiTotal(page)) === library, 'invalid date filtered the library');
  return hint;
});

await check('a range with no entries shows an empty selection', async () => {
  await page.getByTestId('stats-from').fill('2090-03-01');
  await page.getByTestId('stats-to').fill('2090-03-31');
  const expected = await restCount([
    ['item_date', 'gte.2090-03-01'],
    ['item_date', 'lte.2090-03-31'],
  ]);
  assert(expected === 0, `rest ${expected}`);
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="stats-total"]');
    return node && (node.textContent || '').replace(/[^0-9]/g, '') === '0';
  });
  assert((await uiTotal(page)) === 0, 'total');
  await reveal(page.getByTestId('stats-months-empty'));
  assert((await textOf(page.getByTestId('stats-months-empty'))).includes('Nothing'), 'month empty');
  await shot(page, 'stats_empty_dark');
  return '0 entries';
});

await check('a month outside the range counts as empty and opens an empty feed', async () => {
  await clearStats(page);
  await reveal(page.getByTestId('stats-month-2026-09'));
  await tap(page.getByTestId('stats-month-2026-09'));
  await tap(page.getByTestId('stats-range-7'));
  const window = presetWindow('7', now);
  assert((await uiTotal(page)) === 0, 'September overlaps the last 7 days');
  await tap(page.getByTestId('stats-see-entries'));
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="result-count"]');
    return node && /0 entries|Nothing matches|Loading/.test(node.textContent || '');
  });
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="result-count"]');
    const empty = document.body.innerText.includes('Nothing matches');
    return empty || (node && node.textContent.includes('0 entries'));
  });
  assert((await textOf(page.getByTestId('chip-month'))) === 'September 2026', 'month chip');
  assert((await textOf(page.getByTestId('chip-range'))) === rangeText(window.from, window.to), 'range chip');
  const feedText = await textOf(page.getByTestId('result-count'));
  assert(feedText.includes('0'), feedText);
  return 'September and last 7 days';
});

await check('light mode keeps the selection', async () => {
  await tap(page.getByTestId('theme-toggle'));
  await tap(page.getByRole('tab', { name: 'Stats' }));
  await page.getByTestId('stats-chip-month').waitFor();
  await scrollStats(page, 0);
  await shot(page, 'stats_crossfilter_light');
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(background.includes('228') || background.includes('244'), `background ${background}`);
  return background;
});

await check('pull to refresh on web', async () => {
  await scrollStats(page, 0);
  let lastRequest = Date.now();
  const note = () => {
    lastRequest = Date.now();
  };
  page.on('request', note);
  const quietStart = Date.now();
  while (Date.now() - lastRequest < 1200) {
    if (Date.now() - quietStart > 20000) {
      break;
    }
    await page.waitForTimeout(150);
  }
  page.off('request', note);
  await page.evaluate(() => {
    window.__pullMark = 1;
  });
  let fetches = 0;
  const onRequest = (request) => {
    if (request.url().includes('/rest/v1/items') && request.method() === 'GET') {
      fetches += 1;
    }
  };
  page.on('request', onRequest);
  const box = await page.getByTestId('stats-screen').boundingBox();
  assert(box, 'stats screen');
  const x = box.x + box.width / 2;
  const y = Math.min(box.y + 220, 700);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let step = 1; step <= 10; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + step * 16, id: 1 }],
    });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await page.waitForTimeout(1500);
  page.off('request', onRequest);
  const mark = await page.evaluate(() => window.__pullMark ?? 0);
  if (mark !== 1) {
    return 'the pull reloaded the browser document; the app RefreshControl still does not run on web';
  }
  assert(fetches === 0, `pull started ${fetches} fetches without a document reload`);
  return 'gesture did not refresh; react-native-web ignores RefreshControl, so pull to refresh stays on the phone app';
});

await check('no page crash', async () => {
  const serious = consoleErrors.filter((line) => {
    return /Cannot read|is not a function|Minified React error|Uncaught|TypeError|ReferenceError/.test(line);
  });
  assert(serious.length === 0, serious.join(' | '));
  return consoleErrors.length === 0 ? 'clean console' : `${consoleErrors.length} non-fatal console notes`;
});

await context.close();

await check('short screen recording of the interaction', async () => {
  const videoContext = await browser.newContext({
    ...phone,
    recordVideo: { dir: '/tmp/pw/stats-video', size: { width: 390, height: 844 } },
  });
  const videoPage = await videoContext.newPage();
  current = videoPage;
  await openStats(videoPage);
  await videoPage.waitForTimeout(600);
  await tap(videoPage.getByTestId('stats-source-x'));
  await videoPage.getByTestId('stats-chip-source').waitFor();
  await videoPage.waitForTimeout(800);
  await reveal(videoPage.getByTestId('stats-donut'));
  await videoPage.waitForTimeout(400);
  await tap(videoPage.getByTestId('stats-slice-medium'));
  await videoPage.getByTestId('stats-chip-importance').waitFor();
  await videoPage.waitForTimeout(800);
  await reveal(videoPage.getByTestId('stats-topic-bar-Coding'));
  await videoPage.waitForTimeout(400);
  await longPress(videoPage, videoPage.getByTestId('stats-topic-bar-Coding'));
  await videoPage.getByTestId('stats-tooltip').waitFor();
  await videoPage.waitForTimeout(800);
  await tap(videoPage.getByTestId('stats-topic-bar-Coding'));
  await videoPage.getByTestId('stats-chip-topic').waitFor();
  await videoPage.waitForTimeout(700);
  await scrollStats(videoPage, 0);
  await videoPage.waitForTimeout(400);
  await tap(videoPage.getByTestId('stats-range-30'));
  await videoPage.waitForTimeout(900);
  await tap(videoPage.getByTestId('stats-see-entries'));
  await videoPage.getByTestId('chip-source').waitFor({ timeout: 20000 });
  await videoPage.waitForTimeout(1200);
  const video = videoPage.video();
  await videoContext.close();
  const webm = await video.path();
  const mp4 = `${OUT}/stats-interactive.mp4`;
  const encoded = spawnSync(
    'ffmpeg',
    ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4],
    { encoding: 'utf8' },
  );
  assert(encoded.status === 0, encoded.stderr?.slice(-300) || 'ffmpeg failed');
  return mp4;
});

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
