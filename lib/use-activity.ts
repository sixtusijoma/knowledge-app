import { useCallback, useEffect, useState } from 'react';

import type { ActivityBucket, ActivityUnit } from '@/lib/activity';
import type { DateRange } from '@/lib/filters';
import { messageOf } from '@/lib/format';
import { fetchActivity } from '@/lib/queries';
import type { Source } from '@/lib/types';

export function useActivity(args: {
  unit: ActivityUnit;
  range: DateRange;
  source: Source | null;
  topic: string | null;
}) {
  const [buckets, setBuckets] = useState<ActivityBucket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${args.unit}|${args.range.from ?? ''}|${args.range.to ?? ''}|${args.source ?? ''}|${args.topic ?? ''}|${attempt}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBuckets(null);
    fetchActivity({
      unit: args.unit,
      from: args.range.from,
      to: args.range.to,
      source: args.source,
      topic: args.topic,
    })
      .then((next) => {
        if (!cancelled) {
          setBuckets(next);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBuckets(null);
          setError(messageOf(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, args.unit, args.range.from, args.range.to, args.source, args.topic]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { buckets, loading, error, retry };
}
