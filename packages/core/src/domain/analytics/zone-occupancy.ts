import { AccessEvent } from '../events-audit/access-event.entity.js';

export interface OccupantRecord {
  readonly personId: string;
  readonly siteId: string;
  readonly zoneId?: string;
  readonly enteredAt: Date;
  readonly lastDoorId?: string;
}

export interface ZoneOccupancySummary {
  readonly siteId: string;
  readonly zoneId?: string;
  readonly currentCount: number;
  readonly occupants: OccupantRecord[];
  readonly lastCalculatedAt: Date;
}

export class ZoneOccupancyTracker {
  /**
   * Calculate current occupancy and occupants list from access events history.
   */
  public static calculateOccupancy(events: AccessEvent[], targetSiteId?: string): ZoneOccupancySummary {
    const occupantsMap = new Map<string, OccupantRecord>();

    // Process events chronologically
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const ev of sortedEvents) {
      if (targetSiteId && ev.siteId !== targetSiteId) continue;
      if (!ev.personId) continue;

      const isGranted = ev.eventType === 'access.granted' || ev.eventType === 'ACCESS_GRANTED';
      if (!isGranted) continue;

      if (ev.direction === 'in') {
        occupantsMap.set(ev.personId, {
          personId: ev.personId,
          siteId: ev.siteId,
          doorId: ev.doorId ?? undefined,
          enteredAt: ev.timestamp,
          lastDoorId: ev.doorId ?? undefined,
        });
      } else if (ev.direction === 'out') {
        occupantsMap.delete(ev.personId);
      }
    }

    const occupants = Array.from(occupantsMap.values());
    return {
      siteId: targetSiteId ?? 'global',
      currentCount: occupants.length,
      occupants,
      lastCalculatedAt: new Date(),
    };
  }

  /**
   * Server-side Muster Roll report.
   */
  public static generateServerMusterRoll(events: AccessEvent[], siteId?: string): {
    siteId: string;
    generatedAt: Date;
    totalInside: number;
    personIds: string[];
    occupants: OccupantRecord[];
  } {
    const summary = this.calculateOccupancy(events, siteId);
    return {
      siteId: summary.siteId,
      generatedAt: new Date(),
      totalInside: summary.currentCount,
      personIds: summary.occupants.map(o => o.personId),
      occupants: summary.occupants,
    };
  }
}
