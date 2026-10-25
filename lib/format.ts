import type { Importance, Item, Source } from '@/lib/types';

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatEntries(count: number): string {
  if (count === 1) {
    return '1 entry';
  }
  return `${formatCount(count)} entries`;
}

export function formatPercent(part: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }
  return `${Math.round((part / total) * 100)}%`;
}

export function messageOf(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  const lowered = raw.toLowerCase();
  if (
    lowered.includes('failed to fetch') ||
    lowered.includes('network request failed') ||
    lowered.includes('network error')
  ) {
    return 'Could not reach Supabase. Check your connection and try again.';
  }
  if (raw.length > 0) {
    return raw;
  }
  return 'Something went wrong loading your library.';
}

export function openLabel(source: Source): string {
  if (source === 'X Bookmark') {
    return 'Open on X';
  }
  return 'Open in Grok';
}

export function importanceLabel(importance: Importance | null): string {
  if (!importance) {
    return 'Unset';
  }
  return importance;
}

export function sourcePlural(source: Source): string {
  if (source === 'X Bookmark') {
    return 'X Bookmarks';
  }
  return 'Grok Chats';
}

export function externalIdLabel(source: Source): string {
  if (source === 'X Bookmark') {
    return 'X post ID';
  }
  return 'Grok chat ID';
}

// The importer writes `Grok chat titled "<title>".` when a chat has no real summary.
export function meaningfulSummary(item: Pick<Item, 'title' | 'summary'>): string | null {
  const summary = item.summary?.trim() ?? '';
  if (summary.length === 0 || summary === `Grok chat titled "${item.title}".`) {
    return null;
  }
  return summary;
}
