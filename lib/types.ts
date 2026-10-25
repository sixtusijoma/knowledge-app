export type Source = 'X Bookmark' | 'Grok Chat';

export type SourceFilter = 'all' | Source;

export type Item = {
  id: string;
  source: Source;
  external_id: string;
  title: string;
  summary: string | null;
  topics: string[];
  author: string | null;
  item_date: string | null;
  link: string | null;
  created_at: string;
};

export type ItemFilters = {
  source: SourceFilter;
  topics: string[];
  month: string | null;
  from: string | null;
  to: string | null;
};

export type StatRow = {
  source: Source;
  topics: string[];
  item_date: string | null;
};
