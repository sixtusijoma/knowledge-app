export const TOPICS = [
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
] as const;

export type Topic = (typeof TOPICS)[number];

export type TopicColorKey = 'sports' | 'health' | 'music' | 'screen' | 'science' | 'lifestyle' | 'other';

export function topicColorKey(topic: string): TopicColorKey | null {
  if (topic === 'Sports') {
    return 'sports';
  }
  if (topic === 'Health & Fitness') {
    return 'health';
  }
  if (topic === 'Music') {
    return 'music';
  }
  if (topic === 'Movies/TV/Anime') {
    return 'screen';
  }
  if (topic === 'Science & Tech') {
    return 'science';
  }
  if (topic === 'Lifestyle') {
    return 'lifestyle';
  }
  if (topic === 'Other') {
    return 'other';
  }
  return null;
}
