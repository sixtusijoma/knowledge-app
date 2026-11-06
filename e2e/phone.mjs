import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

import { chromium, devices } from 'playwright-core';

const APP = process.env.APP ?? 'http://127.0.0.1:44521';
const OUT = '/opt/cursor/artifacts';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!ANON) {
  console.error('Set EXPO_PUBLIC_SUPABASE_ANON_KEY before running e2e/phone.mjs');
  process.exit(1);
}
const REST = 'https://your-project.supabase.co/rest/v1/items';
const RPC = 'https://your-project.supabase.co/rest/v1/rpc/activity_buckets';
const TOPICS = [
  'Sports',
  'Streamers/Drama',
  'News',
  'Humor/Culture',
  'AI/Agents',
  'Crypto',
  'Finance/Stocks',
  'X/Subscriptions',
  'Game Dev',
  'Coding',
  'Security',
  'Grok Bot',
  'Career',
  'Cursor',
  'Health & Fitness',
  'Music',
  'Movies/TV/Anime',
  'Science & Tech',
  'Lifestyle',
  'Other',
];
const COLORED = ['Sports', 'Health & Fitness', 'Music', 'Movies/TV/Anime', 'Science & Tech', 'Lifestyle', 'Other'];

const iphone = devices['iPhone 13'];
const phone = {
  ...iphone,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const results = [];
let current = null;
let stackedTopic = 'Sports';

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

async function restActivity(unit, from, to) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_unit: unit, p_from: from, p_to: to, p_source: null, p_topic: null }),
  });
  const body = await response.json();
  if (!response.ok) {
    return null;
  }
  let bookmarks = 0;
  let chats = 0;
  for (const row of body) {
    bookmarks += Number(row.bookmarks);
    chats += Number(row.chats);
  }
  return { bookmarks, chats, buckets: body.length };
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
      await current.screenshot({ path: `${OUT}/phone_fail_${results.length}.png` }).catch(() => undefined);
    }
  }
}

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

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

function encodeMp4(webm, mp4) {
  const encoded = spawnSync(
    'ffmpeg',
    ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4],
    { encoding: 'utf8' },
  );
  assert(encoded.status === 0, encoded.stderr?.slice(-300) || 'ffmpeg failed');
  return mp4;
}

async function totalOf(page) {
  return num(await textOf(page.getByTestId('stats-total')));
}

function monthEnd(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

async function clearFeedChips(page) {
  const ids = ['chip-source', 'chip-month', 'chip-range'];
  for (const id of ids) {
    const chip = page.getByTestId(id);
    if ((await chip.count()) > 0 && (await chip.isVisible())) {
      await chip.click();
      await page.waitForTimeout(150);
    }
  }
  for (let guard = 0; guard < 8; guard += 1) {
    const topic = page.locator('[data-testid^="chip-topic-"]').first();
    if ((await topic.count()) === 0 || !(await topic.isVisible())) {
      break;
    }
    await topic.click();
    await page.waitForTimeout(150);
  }
  await waitForCount(page);
}

async function waitForCount(page) {
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="result-count"]');
    const text = node?.textContent ?? '';
    return /\d/.test(text) && !/Loading/.test(text);
  }, { timeout: 40000 });
}

async function openFeed(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('search-input').waitFor({ timeout: 60000 });
  await waitForCount(page);
}

async function presentTopics() {
  const counts = await Promise.all(
    TOPICS.map(async (topic) => {
      const count = await restCount([['topics', `ov.{"${topic}"}`]]);
      return count > 0 ? topic : null;
    }),
  );
  return counts.filter((topic) => topic !== null);
}

async function filterTopicNames(page) {
  return page.locator('[data-testid^="filter-topic-"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('filter-topic-', ''));
  });
}

async function dismissFilters(page) {
  const sheet = page.getByTestId('filter-sheet');
  if ((await sheet.count()) > 0 && (await sheet.isVisible())) {
    await page.getByTestId('filter-done').click();
    await sheet.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

async function openStats(page) {
  await dismissFilters(page);
  await page.getByRole('tab', { name: 'Stats' }).click();
  await page.getByTestId('stats-screen').waitFor({ timeout: 15000 });
  await page.getByTestId('stats-total').waitFor({ timeout: 90000 });
  await page.getByTestId('stats-activity').waitFor({ timeout: 20000 });
}

async function activityReady(page) {
  await page.waitForFunction(() => {
    const loading = document.querySelector('[data-testid="stats-activity-loading"]');
    const ready = document.querySelector('[data-testid="stats-activity-bookmarks"]');
    return !loading && ready;
  }, { timeout: 40000 });
}

async function longPress(page, testId) {
  const box = await page.getByTestId(testId).boundingBox();
  assert(box, testId);
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, box.y + box.height - 8);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(700);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

async function drag(page, testId, distance) {
  const box = await page.getByTestId(testId).boundingBox();
  assert(box, testId);
  const x = box.x + box.width / 2;
  const startY = box.y + Math.min(box.height * 0.75, 640);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY, id: 1 }],
  });
  const steps = 8;
  for (let step = 1; step <= steps; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY - (distance * step) / steps, id: 1 }],
    });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

await mkdir(OUT, { recursive: true });
await mkdir('/tmp/pw/phone-video', { recursive: true });

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

await check('phone profile is touch and mobile', async () => {
  assert(phone.hasTouch === true, 'hasTouch');
  assert(phone.isMobile === true, 'isMobile');
  assert(phone.viewport.width === 390 && phone.viewport.height === 844, 'viewport');
  return '390×844, hasTouch, isMobile';
});

await openFeed(page);
await shot(page, 'feed_dark');

await check('feed count matches Supabase', async () => {
  const shown = num(await textOf(page.getByTestId('result-count')));
  const total = await restCount([]);
  assert(shown === total, `ui ${shown} rest ${total}`);
  return `${shown} entries`;
});

await check('filters hide empty topics and have no importance', async () => {
  try {
    const expectedPromise = presentTopics();
    await page.getByTestId('filter-button').click();
    await page.getByTestId('filter-sheet').waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-testid="filter-topics-loading"]'), undefined, {
      timeout: 30000,
    });
    const sheet = await page.getByTestId('filter-sheet').innerText();
    assert(!/importance/i.test(sheet), 'importance is still in the filter sheet');
    assert((await page.locator('[data-testid*="importance"]').count()) === 0, 'importance test id');
    let shown = await filterTopicNames(page);
    let expected = await expectedPromise;
    if (shown.join('|') !== expected.join('|')) {
      await dismissFilters(page);
      await openFeed(page);
      const again = presentTopics();
      await page.getByTestId('filter-button').click();
      await page.getByTestId('filter-sheet').waitFor();
      await page.waitForFunction(() => !document.querySelector('[data-testid="filter-topics-loading"]'), undefined, {
        timeout: 30000,
      });
      shown = await filterTopicNames(page);
      expected = await again;
    }
    assert(shown.join('|') === expected.join('|'), `shown ${shown.join('|')} expected ${expected.join('|')}`);
    await shot(page, 'filters_dark');
    let note = 'Sports is hidden because it has no rows';
    if (expected.includes('Sports')) {
      await tap(page.getByTestId('filter-topic-Sports'));
      await page.waitForFunction(() => {
        const node = document.querySelector('[data-testid="result-count"]');
        return node && !/Loading/.test(node.textContent || '') && /\d/.test(node.textContent || '');
      });
      const live = num(await textOf(page.getByTestId('result-count')));
      const sports = await restCount([['topics', 'ov.{"Sports"}']]);
      assert(live === sports, `sports ui ${live} rest ${sports}`);
      note = `Sports ${sports}`;
      await page.getByTestId('filter-clear').click();
    }
    return `${shown.length} topics, ${note}`;
  } finally {
    await dismissFilters(page).catch(() => undefined);
  }
});

await check('detail has no importance', async () => {
  await waitForCount(page);
  await tap(page.getByTestId('item-card').first());
  await page.getByTestId('detail-title').waitFor({ timeout: 20000 });
  assert((await page.getByTestId('detail-importance').count()) === 0, 'detail importance');
  const source = await textOf(page.getByTestId('detail-source'));
  assert(source === 'X Bookmark' || source === 'Grok Chat', source);
  await shot(page, 'detail_dark');
  await tap(page.getByTestId('back-button'));
  await page.getByTestId('feed-screen').waitFor();
  return source;
});

await check('feed paginates past the first page', async () => {
  let shown = 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const label = await textOf(page.getByTestId('loaded-count'));
    const match = /Showing\s+([\d,]+)/.exec(label);
    shown = match ? num(match[1]) : 0;
    if (shown >= 40) {
      break;
    }
    await drag(page, 'feed-list', 520);
    await page.waitForTimeout(700);
  }
  const label = await textOf(page.getByTestId('loaded-count'));
  assert(shown >= 40, `still ${label}`);
  const total = num(await textOf(page.getByTestId('result-count')));
  assert(label.includes(total.toLocaleString('en-US')) || label.includes(String(total)), label);
  return label;
});

await openStats(page);
await shot(page, 'stats_dark');

await check('stats totals match Supabase and importance is gone', async () => {
  const total = num(await textOf(page.getByTestId('stats-total')));
  const x = num(await textOf(page.getByTestId('stats-x')));
  const grok = num(await textOf(page.getByTestId('stats-grok')));
  const restTotal = await restCount([]);
  const restX = await restCount([['source', 'eq.X Bookmark']]);
  const restGrok = await restCount([['source', 'eq.Grok Chat']]);
  assert(total === restTotal, `total ${total} ${restTotal}`);
  assert(x === restX, `x ${x} ${restX}`);
  assert(grok === restGrok, `grok ${grok} ${restGrok}`);
  const statsText = await page.getByTestId('stats-screen').innerText();
  assert(!/importance/i.test(statsText), 'importance text on stats');
  assert((await page.locator('[data-testid*="importance"]').count()) === 0, 'importance test id');
  return `${total} = ${x} + ${grok}`;
});

await check('activity by month matches dated rows', async () => {
  await reveal(page.getByTestId('stats-activity'));
  await activityReady(page);
  const bookmarks = num(await textOf(page.getByTestId('stats-activity-bookmarks')));
  const chats = num(await textOf(page.getByTestId('stats-activity-chats')));
  const datedX = await restCount([
    ['source', 'eq.X Bookmark'],
    ['item_date', 'not.is.null'],
  ]);
  const datedGrok = await restCount([
    ['source', 'eq.Grok Chat'],
    ['item_date', 'not.is.null'],
  ]);
  const rpc = await restActivity('month', null, null);
  assert(bookmarks === datedX, `bookmarks ui ${bookmarks} rest ${datedX}`);
  assert(chats === datedGrok, `chats ui ${chats} rest ${datedGrok}`);
  if (rpc) {
    assert(bookmarks === rpc.bookmarks && chats === rpc.chats, `rpc ${rpc.bookmarks}/${rpc.chats}`);
  }
  const months = await page.locator('[data-testid^="stats-activity-20"]').evaluateAll((nodes) => {
    return nodes.map((node) => node.getAttribute('data-testid'));
  });
  assert(months.length > 3, `buckets ${months.length}`);
  assert(months.some((id) => id?.endsWith('-01')), months.slice(0, 3).join(','));
  await shot(page, 'activity_month_dark');
  const where = await textOf(page.getByTestId('stats-activity-source'));
  return `${where} ${bookmarks} bookmarks, ${chats} chats, ${months.length} months`;
});

await check('activity by week keeps the same totals', async () => {
  await tap(page.getByTestId('stats-activity-week'));
  await page.waitForTimeout(150);
  await activityReady(page);
  const bookmarks = num(await textOf(page.getByTestId('stats-activity-bookmarks')));
  const datedX = await restCount([
    ['source', 'eq.X Bookmark'],
    ['item_date', 'not.is.null'],
  ]);
  const rpc = await restActivity('week', null, null);
  assert(bookmarks === datedX, `week bookmarks ${bookmarks} rest ${datedX}`);
  if (rpc) {
    assert(bookmarks === rpc.bookmarks, `week rpc ${rpc.bookmarks}`);
  }
  const weeks = await page.locator('[data-testid^="stats-activity-20"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-activity-', ''));
  });
  assert(weeks.length > 3, `weeks ${weeks.length}`);
  const monday = weeks.every((iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1;
  });
  assert(monday, `not all Mondays: ${weeks.slice(0, 4).join(', ')}`);
  await shot(page, 'activity_week_dark');
  return `${weeks.length} weeks`;
});

await check('activity by day for the last 30 days matches Supabase', async () => {
  await tap(page.getByTestId('stats-range-30'));
  await page.waitForTimeout(200);
  await activityReady(page);
  const window = presetWindow('30', now);
  const bookmarks = num(await textOf(page.getByTestId('stats-activity-bookmarks')));
  const chats = num(await textOf(page.getByTestId('stats-activity-chats')));
  const restX = await restCount([
    ['source', 'eq.X Bookmark'],
    ['item_date', `gte.${window.from}`],
    ['item_date', `lte.${window.to}`],
  ]);
  const restGrok = await restCount([
    ['source', 'eq.Grok Chat'],
    ['item_date', `gte.${window.from}`],
    ['item_date', `lte.${window.to}`],
  ]);
  const rpc = await restActivity('day', window.from, window.to);
  assert(bookmarks === restX, `day bookmarks ${bookmarks} rest ${restX}`);
  assert(chats === restGrok, `day chats ${chats} rest ${restGrok}`);
  if (rpc) {
    assert(bookmarks === rpc.bookmarks && chats === rpc.chats, `day rpc ${rpc.bookmarks}/${rpc.chats}`);
  }
  const unit = await page.getByTestId('stats-activity-day').getAttribute('aria-selected');
  assert(unit === 'true', 'day granularity was not selected');
  await reveal(page.getByTestId('stats-activity'));
  await shot(page, 'activity_day_dark');
  return `${window.from}..${window.to} ${bookmarks}+${chats}`;
});

await check('legend hides a series and a tap opens that day', async () => {
  await tap(page.getByTestId('stats-activity-bookmarks-toggle'));
  const hidden = await page.getByTestId('stats-activity-bookmarks-toggle').getAttribute('aria-selected');
  assert(hidden === 'false', `legend ${hidden}`);
  await tap(page.getByTestId('stats-activity-bookmarks-toggle'));
  const days = await page.locator('[data-testid^="stats-activity-20"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-activity-', ''));
  });
  assert(days.length > 0, 'no day buckets');
  const day = days[days.length - 1];
  const callout = await page.getByTestId(`stats-activity-${day}`).getAttribute('aria-label');
  await tap(page.getByTestId(`stats-activity-${day}`));
  const tip = await textOf(page.getByTestId('stats-tooltip'));
  assert(tip === callout, `tip ${tip} aria ${callout}`);
  const match = /([\d,]+) bookmarks · ([\d,]+) chats/.exec(tip);
  assert(match, tip);
  const rest = await restCount([
    ['item_date', `gte.${day}`],
    ['item_date', `lte.${day}`],
  ]);
  await page.getByTestId('chip-range').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction((expected) => {
    const node = document.querySelector('[data-testid="result-count"]');
    if (!node) {
      return false;
    }
    const text = node.textContent ?? '';
    if (/Loading|Not loaded/.test(text)) {
      return false;
    }
    const found = text.replace(/,/g, '').match(/(\d+)/);
    return found !== null && Number(found[1]) === expected;
  }, rest, { timeout: 30000 });
  const ui = num(await textOf(page.getByTestId('result-count')));
  assert(ui === rest, `feed ${ui} rest ${rest}`);
  assert(ui === num(match[1]) + num(match[2]), `feed ${ui} tip ${tip}`);
  await shot(page, 'feed_from_activity_dark');
  return `${day}: ${tip}`;
});

await check('colored topics match live counts or stay hidden', async () => {
  await tap(page.getByRole('tab', { name: 'Stats' }));
  await page.getByTestId('stats-total').waitFor({ timeout: 20000 });
  if ((await page.getByTestId('stats-clear').count()) > 0) {
    await tap(page.getByTestId('stats-clear'));
    await page.waitForTimeout(200);
  }
  const notes = [];
  let sample = null;
  let sampleCount = 0;
  for (const topic of COLORED) {
    const rest = await restCount([['topics', `ov.{"${topic}"}`]]);
    const bar = page.getByTestId(`stats-topic-${topic}`);
    if (rest === 0) {
      assert((await bar.count()) === 0, `${topic} bar with zero rows`);
      notes.push(`${topic} hidden`);
      continue;
    }
    await reveal(bar);
    const shown = num(await textOf(bar));
    assert(shown === rest, `${topic} chart ${shown} rest ${rest}`);
    notes.push(`${topic} ${shown}`);
    if (!sample) {
      sample = topic;
      sampleCount = rest;
    }
  }
  if (sample) {
    await page.getByTestId(`stats-topic-bar-${sample}`).click();
    await page.waitForTimeout(150);
    assert((await totalOf(page)) === sampleCount, `${sample} filter ${await totalOf(page)} rest ${sampleCount}`);
    await page.getByTestId(`stats-topic-bar-${sample}`).click();
    await page.waitForTimeout(150);
    assert((await page.getByTestId('stats-chip-topic').count()) === 0, `${sample} stayed selected`);
  }
  if ((await page.getByTestId('stats-topic-Other').count()) > 0) {
    await reveal(page.getByTestId('stats-topic-Other'));
    await shot(page, 'topics_dark');
  }
  return notes.join(', ');
});

await check('a source tap filters the totals and a second tap clears it', async () => {
  if ((await page.getByTestId('stats-clear').count()) > 0) {
    await page.getByTestId('stats-clear').click();
    await page.waitForTimeout(150);
  }
  const library = await totalOf(page);
  const restAll = await restCount([]);
  const restGrok = await restCount([['source', 'eq.Grok Chat']]);
  const restX = await restCount([['source', 'eq.X Bookmark']]);
  assert(library === restAll, `library ${library} rest ${restAll}`);
  await reveal(page.getByTestId('stats-source-x'));
  await longPress(page, 'stats-source-x');
  const held = await textOf(page.getByTestId('stats-tooltip'));
  assert(/X bookmarks · [\d,]+ entries · [\d.]+%/.test(held), held);
  assert((await page.getByTestId('stats-chip-source').count()) === 0, 'a long press selected the source');
  assert((await totalOf(page)) === library, 'a long press changed the total');
  await page.getByTestId('stats-source-grok').click();
  await page.waitForTimeout(150);
  const tip = await textOf(page.getByTestId('stats-tooltip'));
  const shown = /Grok chats · ([\d,]+) entries · [\d.]+%/.exec(tip);
  assert(shown, tip);
  assert(num(shown[1]) === restGrok, `tooltip ${shown[1]} rest ${restGrok}`);
  assert((await totalOf(page)) === restGrok, `total ${await totalOf(page)} rest ${restGrok}`);
  assert((await page.getByTestId('stats-x').innerText()).replace(/\D/g, '') === '0', 'x tile stayed');
  const openX = num(await textOf(page.getByTestId('stats-source-x-count')));
  assert(openX === restX, `source chart closed ${openX} rest ${restX}`);
  await page.getByTestId('stats-source-grok').click();
  await page.waitForTimeout(150);
  assert((await page.getByTestId('stats-chip-source').count()) === 0, 'source chip stayed');
  assert((await totalOf(page)) === restAll, 'unselect did not restore the total');
  return `long-press tooltip, then ${restGrok} chats`;
});

await check('source, topic, and month selections stack', async () => {
  await page.getByTestId('stats-source-grok').click();
  if ((await page.getByTestId('stats-topic-bar-Sports').count()) === 0) {
    const names = await page.locator('[data-testid^="stats-topic-bar-"]').evaluateAll((nodes) => {
      return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-topic-bar-', ''));
    });
    assert(names.length > 0, 'no topic bars');
    stackedTopic = names[0];
  } else {
    stackedTopic = 'Sports';
  }
  await reveal(page.getByTestId(`stats-topic-bar-${stackedTopic}`));
  await page.getByTestId(`stats-topic-bar-${stackedTopic}`).click();
  await page.waitForTimeout(150);
  const stacked = await restCount([
    ['source', 'eq.Grok Chat'],
    ['topics', `ov.{"${stackedTopic}"}`],
  ]);
  const tip = await textOf(page.getByTestId('stats-tooltip'));
  assert(tip.startsWith(`${stackedTopic} · `), tip);
  assert(/[\d,]+ entr(?:y|ies) · [\d.]+%/.test(tip), tip);
  assert((await totalOf(page)) === stacked, `stacked ${await totalOf(page)} rest ${stacked}`);
  assert((await page.getByTestId('stats-chip-source').count()) === 1, 'source chip');
  assert((await page.getByTestId('stats-chip-topic').count()) === 1, 'topic chip');
  const months = await page.locator('[data-testid^="stats-month-20"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-month-', ''));
  });
  assert(months.length > 0, 'no month bars');
  const month = months[months.length - 1];
  await reveal(page.getByTestId(`stats-month-${month}`));
  await page.getByTestId(`stats-month-${month}`).click();
  await page.waitForTimeout(150);
  const rest = await restCount([
    ['source', 'eq.Grok Chat'],
    ['topics', `ov.{"${stackedTopic}"}`],
    ['item_date', `gte.${month}-01`],
    ['item_date', `lte.${monthEnd(month)}`],
  ]);
  const monthTip = await textOf(page.getByTestId('stats-tooltip'));
  assert(/[\d,]+ entr(?:y|ies) · [\d.]+%/.test(monthTip), monthTip);
  assert((await totalOf(page)) === rest, `month stack ${await totalOf(page)} rest ${rest}`);
  assert((await page.getByTestId('stats-chip-month').count()) === 1, 'month chip');
  await reveal(page.getByTestId('stats-total'));
  await shot(page, 'stats_crossfilter_dark');
  return `${month}: ${rest}`;
});

await check('See entries opens the feed with the same filters', async () => {
  const expected = await totalOf(page);
  await page.getByTestId('stats-see-entries').click();
  await page.getByTestId('chip-source').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId(`chip-topic-${stackedTopic}`).waitFor({ state: 'visible' });
  await page.getByTestId('chip-month').waitFor({ state: 'visible' });
  await page.waitForFunction((count) => {
    const node = document.querySelector('[data-testid="result-count"]');
    const text = node?.textContent ?? '';
    if (/Loading|Not loaded/.test(text)) {
      return false;
    }
    const found = text.replace(/,/g, '').match(/(\d+)/);
    return found !== null && Number(found[1]) === count;
  }, expected, { timeout: 30000 });
  const ui = num(await textOf(page.getByTestId('result-count')));
  assert(ui === expected, `feed ${ui} stats ${expected}`);
  await shot(page, 'feed_from_stats_dark');
  return `${ui} entries`;
});

await check('a custom from and to filters every total', async () => {
  await page.getByRole('tab', { name: 'Stats' }).click();
  await page.getByTestId('stats-clear').click();
  await page.waitForTimeout(150);
  await page.getByTestId('stats-range-custom').click();
  await page.getByTestId('stats-from').fill('2026-10-01');
  await page.getByTestId('stats-to').fill('2026-10-07');
  await page.waitForTimeout(250);
  const ui = await totalOf(page);
  const rest = await restCount([
    ['item_date', 'gte.2026-10-01'],
    ['item_date', 'lte.2026-10-07'],
  ]);
  assert(ui === rest, `custom ${ui} rest ${rest}`);
  const label = await page.getByTestId('stats-range-label').getAttribute('aria-label');
  assert(label === '2026-10-01..2026-10-07', label);
  await shot(page, 'stats_custom_dark');
  await page.getByTestId('stats-clear').click();
  await page.waitForTimeout(150);
  return `${ui} entries`;
});

await check('light theme still has every screen', async () => {
  await page.getByRole('tab', { name: 'Feed' }).click();
  await clearFeedChips(page);
  await page.getByTestId('theme-toggle').click();
  await page.waitForTimeout(300);
  await shot(page, 'feed_light');
  await page.getByTestId('filter-button').click();
  await page.getByTestId('filter-sheet').waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-testid="filter-topics-loading"]'), undefined, {
    timeout: 30000,
  });
  await page.waitForTimeout(600);
  const sportsChip = page.getByTestId('filter-topic-Sports');
  if ((await sportsChip.count()) > 0) {
    await reveal(sportsChip);
  }
  await shot(page, 'filters_light');
  await page.getByTestId('filter-done').click();
  await page.getByTestId('filter-sheet').waitFor({ state: 'hidden', timeout: 5000 });
  await page.getByTestId('item-card').first().click();
  await page.getByTestId('detail-title').waitFor({ timeout: 20000 });
  await shot(page, 'detail_light');
  await page.getByTestId('back-button').click();
  await page.getByRole('tab', { name: 'Stats' }).click();
  await page.getByTestId('stats-activity').waitFor({ timeout: 20000 });
  await reveal(page.getByTestId('stats-total'));
  await shot(page, 'stats_light');
  await reveal(page.getByTestId('stats-activity'));
  await activityReady(page).catch(() => undefined);
  await shot(page, 'activity_light');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(bg !== 'rgb(12, 18, 32)' && bg !== 'rgb(7, 11, 18)', `still dark ${bg}`);
  return bg;
});

await check('no page crash', async () => {
  const serious = consoleErrors.filter((line) => {
    return /Cannot read|is not a function|Minified React error|Uncaught|TypeError|ReferenceError/.test(line);
  });
  assert(serious.length === 0, serious.join(' | ').slice(0, 300));
  const notes = consoleErrors.map((line) => line.replace(/\s+/g, ' ').slice(0, 160)).join(' || ');
  return consoleErrors.length === 0 ? 'clean console' : `${consoleErrors.length} console notes: ${notes}`;
});

await context.close();

await check('short recording of the activity chart and theme', async () => {
  const videoContext = await browser.newContext({
    ...phone,
    recordVideo: { dir: '/tmp/pw/phone-video', size: { width: 390, height: 844 } },
  });
  const videoPage = await videoContext.newPage();
  current = videoPage;
  await openFeed(videoPage);
  await openStats(videoPage);
  await reveal(videoPage.getByTestId('stats-activity'));
  await activityReady(videoPage).catch(() => undefined);
  await videoPage.waitForTimeout(700);
  await videoPage.getByTestId('stats-activity-week').click().catch(() => undefined);
  await videoPage.waitForTimeout(800);
  await videoPage.getByTestId('stats-activity-day').click().catch(() => undefined);
  await videoPage.waitForTimeout(800);
  await videoPage.getByTestId('stats-activity-chats-toggle').click().catch(() => undefined);
  await videoPage.waitForTimeout(400);
  await videoPage.getByTestId('stats-activity-chats-toggle').click().catch(() => undefined);
  const days = await videoPage.locator('[data-testid^="stats-activity-20"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-activity-', ''));
  });
  if (days.length > 0) {
    await tap(videoPage.getByTestId(`stats-activity-${days[days.length - 1]}`));
    await videoPage.getByTestId('stats-tooltip').waitFor({ timeout: 5000 }).catch(() => undefined);
    await videoPage.waitForTimeout(900);
    await videoPage.getByTestId('feed-screen').waitFor({ timeout: 10000 }).catch(() => undefined);
  }
  await videoPage.getByRole('tab', { name: 'Feed' }).click();
  await videoPage.getByTestId('theme-toggle').click();
  await videoPage.waitForTimeout(1200);
  const video = videoPage.video();
  await videoContext.close();
  return encodeMp4(await video.path(), `${OUT}/activity-theme.mp4`);
});

await check('short recording of stacked chart filters', async () => {
  const videoContext = await browser.newContext({
    ...phone,
    recordVideo: { dir: '/tmp/pw/phone-video', size: { width: 390, height: 844 } },
  });
  const videoPage = await videoContext.newPage();
  current = videoPage;
  await openFeed(videoPage);
  await openStats(videoPage);
  await reveal(videoPage.getByTestId('stats-source-grok'));
  await videoPage.getByTestId('stats-source-grok').click();
  await videoPage.waitForTimeout(500);
  const topicBars = await videoPage.locator('[data-testid^="stats-topic-bar-"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-topic-bar-', ''));
  });
  const videoTopic = topicBars.includes('Sports') ? 'Sports' : topicBars[0];
  if (videoTopic) {
    await reveal(videoPage.getByTestId(`stats-topic-bar-${videoTopic}`));
    await videoPage.getByTestId(`stats-topic-bar-${videoTopic}`).click();
  }
  await videoPage.waitForTimeout(600);
  const months = await videoPage.locator('[data-testid^="stats-month-20"]').evaluateAll((nodes) => {
    return nodes.map((node) => (node.getAttribute('data-testid') ?? '').replace('stats-month-', ''));
  });
  if (months.length > 0) {
    const month = months[months.length - 1];
    await reveal(videoPage.getByTestId(`stats-month-${month}`));
    await videoPage.getByTestId(`stats-month-${month}`).click();
    await videoPage.waitForTimeout(500);
  }
  await reveal(videoPage.getByTestId('stats-total'));
  await videoPage.waitForTimeout(600);
  await videoPage.getByTestId('stats-see-entries').click();
  await videoPage.getByTestId('chip-source').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  await videoPage.waitForTimeout(900);
  const video = videoPage.video();
  await videoContext.close();
  return encodeMp4(await video.path(), `${OUT}/stats-crossfilter.mp4`);
});

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
