import { useEffect, useState } from 'react';

import { fetchPresentTopics } from '@/lib/queries';
import { TOPICS } from '@/lib/topics';

export function usePresentTopics(): { topics: string[]; ready: boolean } {
  const [topics, setTopics] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPresentTopics()
      .then((next) => {
        if (!cancelled) {
          setTopics(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTopics([...TOPICS]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!topics) {
    return { topics: [], ready: false };
  }
  return { topics, ready: true };
}
