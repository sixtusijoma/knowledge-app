export const TOPICS = [
  'AI/Agents',
  'Coding',
  'Cursor',
  'Grok Bot',
  'X/Subscriptions',
  'Finance/Stocks',
  'Crypto',
  'Career',
  'Game Dev',
  'Security',
  'Humor/Culture',
  'Streamers/Drama',
  'News',
  'Sports',
  'Other',
] as const;

export type Topic = (typeof TOPICS)[number];

export function isSports(topic: string): boolean {
  return topic === 'Sports';
}
