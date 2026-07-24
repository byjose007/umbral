import { AccessEvent } from '../events-audit/access-event.entity.js';

export interface FlowBucket {
  readonly bucketKey: string; // e.g. "2026-07-23" or "2026-07-23T14:00:00Z"
  readonly doorId?: string;
  readonly siteId?: string;
  readonly totalEntries: number;
  readonly totalExits: number;
  readonly totalFlow: number;
  readonly grantedCount: number;
  readonly deniedCount: number;
}

export interface PeakFlowDayResult {
  readonly date: string; // YYYY-MM-DD
  readonly totalFlow: number;
  readonly totalEntries: number;
  readonly totalExits: number;
  readonly peakHour?: string;
}

export class FlowAggregator {
  /**
   * Aggregate access events into daily flow buckets.
   */
  public static aggregateByDay(events: AccessEvent[]): Map<string, FlowBucket> {
    const map = new Map<string, FlowBucket>();

    for (const event of events) {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      const existing = map.get(dateKey) ?? {
        bucketKey: dateKey,
        siteId: event.siteId,
        totalEntries: 0,
        totalExits: 0,
        totalFlow: 0,
        grantedCount: 0,
        deniedCount: 0,
      };

      const isGranted = event.eventType === 'access.granted' || event.eventType === 'ACCESS_GRANTED';
      const isDenied = event.eventType === 'access.denied' || event.eventType === 'ACCESS_DENIED';
      const direction = event.direction;

      let totalEntries = existing.totalEntries;
      let totalExits = existing.totalExits;

      if (isGranted) {
        if (direction === 'in') totalEntries++;
        else if (direction === 'out') totalExits++;
        else totalEntries++;
      }

      map.set(dateKey, {
        bucketKey: dateKey,
        siteId: event.siteId,
        totalEntries,
        totalExits,
        totalFlow: totalEntries + totalExits,
        grantedCount: existing.grantedCount + (isGranted ? 1 : 0),
        deniedCount: existing.deniedCount + (isDenied ? 1 : 0),
      });
    }

    return map;
  }

  /**
   * Find peak flow day in a given period using precalculated daily buckets.
   */
  public static findPeakFlowDay(dailyBuckets: FlowBucket[]): PeakFlowDayResult | null {
    if (dailyBuckets.length === 0) return null;

    let peakBucket = dailyBuckets[0];
    for (const bucket of dailyBuckets) {
      if (bucket.totalFlow > peakBucket.totalFlow) {
        peakBucket = bucket;
      }
    }

    return {
      date: peakBucket.bucketKey,
      totalFlow: peakBucket.totalFlow,
      totalEntries: peakBucket.totalEntries,
      totalExits: peakBucket.totalExits,
    };
  }
}
