import { AccessEvent } from '../events-audit/access-event.entity.js';

export type AnomalyType = 'ORPHANED_ACCESS' | 'IMPOSSIBLE_TRAVEL' | 'INFERRED_TAILGATING';

export interface AccessAnomaly {
  readonly id: string;
  readonly type: AnomalyType;
  readonly personId?: string;
  readonly siteId: string;
  readonly doorId?: string;
  readonly timestamp: Date;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly details: Record<string, unknown>;
}

export class AnomalyDetector {
  /**
   * Scan access events for security anomalies.
   */
  public static detectAnomalies(events: AccessEvent[]): AccessAnomaly[] {
    const anomalies: AccessAnomaly[] = [];

    // Group events by person
    const personEventsMap = new Map<string, AccessEvent[]>();
    for (const ev of events) {
      if (!ev.personId) continue;
      const list = personEventsMap.get(ev.personId) ?? [];
      list.push(ev);
      personEventsMap.set(ev.personId, list);
    }

    for (const [personId, personEvents] of personEventsMap.entries()) {
      const sorted = [...personEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      let currentStatus: 'in' | 'out' | null = null;
      let lastEvent: AccessEvent | null = null;

      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        const isGranted = curr.eventType === 'access.granted';
        if (!isGranted) continue;

        // 1. Check Orphaned Access (e.g. entry after entry without exit)
        if (curr.direction === 'in') {
          if (currentStatus === 'in' && lastEvent) {
            anomalies.push({
              id: `anomaly-orphan-${curr.id}`,
              type: 'ORPHANED_ACCESS',
              personId,
              siteId: curr.siteId,
              doorId: curr.doorId ?? undefined,
              timestamp: curr.timestamp,
              description: `Orphaned entry detected for person '${personId}': second entry without recorded exit`,
              severity: 'medium',
              details: { previousEventId: lastEvent.id, previousTimestamp: lastEvent.timestamp },
            });
          }
          currentStatus = 'in';
        } else if (curr.direction === 'out') {
          if (currentStatus === 'out' || currentStatus === null) {
            anomalies.push({
              id: `anomaly-orphan-${curr.id}`,
              type: 'ORPHANED_ACCESS',
              personId,
              siteId: curr.siteId,
              doorId: curr.doorId ?? undefined,
              timestamp: curr.timestamp,
              description: `Orphaned exit detected for person '${personId}': exit without recorded entry`,
              severity: 'low',
              details: { eventId: curr.id },
            });
          }
          currentStatus = 'out';
        }

        // 2. Check Impossible Travel (e.g. access at different sites within 60 seconds)
        if (lastEvent) {
          const timeDiffSeconds = (curr.timestamp.getTime() - lastEvent.timestamp.getTime()) / 1000;
          if (lastEvent.siteId !== curr.siteId && timeDiffSeconds < 60) {
            anomalies.push({
              id: `anomaly-travel-${curr.id}`,
              type: 'IMPOSSIBLE_TRAVEL',
              personId,
              siteId: curr.siteId,
              doorId: curr.doorId ?? undefined,
              timestamp: curr.timestamp,
              description: `Impossible travel detected for person '${personId}': site change in ${timeDiffSeconds.toFixed(1)}s`,
              severity: 'high',
              details: {
                previousSiteId: lastEvent.siteId,
                currentSiteId: curr.siteId,
                timeDiffSeconds,
              },
            });
          }
        }

        lastEvent = curr;
      }
    }

    // 3. Check Inferred Tailgating (e.g. multiple card swipes within 2 seconds at same door)
    const doorEventsMap = new Map<string, AccessEvent[]>();
    for (const ev of events) {
      if (!ev.doorId) continue;
      const list = doorEventsMap.get(ev.doorId) ?? [];
      list.push(ev);
      doorEventsMap.set(ev.doorId, list);
    }

    for (const [doorId, doorEvents] of doorEventsMap.entries()) {
      const sorted = [...doorEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const deltaMs = curr.timestamp.getTime() - prev.timestamp.getTime();

        if (deltaMs < 2000 && prev.personId !== curr.personId) {
          anomalies.push({
            id: `anomaly-tailgate-${curr.id}`,
            type: 'INFERRED_TAILGATING',
            personId: curr.personId ?? undefined,
            siteId: curr.siteId,
            doorId,
            timestamp: curr.timestamp,
            description: `Potential tailgating inferred at door '${doorId}': accesses separated by ${deltaMs}ms`,
            severity: 'medium',
            details: { previousPersonId: prev.personId, currentPersonId: curr.personId, deltaMs },
          });
        }
      }
    }

    return anomalies;
  }
}
