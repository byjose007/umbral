import { Injectable, BadRequestException } from '@nestjs/common';
import {
  AccessEvent,
  computeEventHash,
  verifyEventChain,
  GENESIS_HASH,
  makeAccessEventId,
  makeSiteId,
  makeDoorId,
  makeControllerId,
  makePersonId,
  makeCredentialId,
} from '@umbral/core';
import {
  RecordEventDto,
  QueryEventsDto,
  VerifyChainDto,
  PurgeEventsDto,
} from './dto/events-audit.dto';
import { v4 as uuidv4 } from './uuid';

@Injectable()
export class EventsAuditService {
  private readonly eventsByPartitionMap = new Map<string, AccessEvent[]>();

  public recordEvent(dto: RecordEventDto) {
    const partition = dto.chainPartition;
    const partitionEvents = this.eventsByPartitionMap.get(partition) || [];

    const sequenceNumber = partitionEvents.length + 1;
    const previousHash =
      partitionEvents.length > 0
        ? partitionEvents[partitionEvents.length - 1]!.currentHash
        : GENESIS_HASH;

    const id = makeAccessEventId(uuidv4());
    const timestampISO = dto.timestamp || new Date().toISOString();
    const timestamp = new Date(timestampISO);
    const details = dto.details || {};
    const payloadStr = JSON.stringify(details);

    const currentHash = computeEventHash(
      previousHash,
      id,
      timestampISO,
      dto.eventType,
      payloadStr
    );

    const res = AccessEvent.create({
      id,
      chainPartition: partition,
      sequenceNumber,
      previousHash,
      currentHash,
      eventType: dto.eventType,
      severity: dto.severity,
      siteId: makeSiteId(dto.siteId),
      doorId: dto.doorId ? makeDoorId(dto.doorId) : null,
      controllerId: dto.controllerId ? makeControllerId(dto.controllerId) : null,
      personId: dto.personId ? makePersonId(dto.personId) : null,
      credentialId: dto.credentialId ? makeCredentialId(dto.credentialId) : null,
      direction: dto.direction,
      reasonCode: dto.reasonCode,
      details,
      timestamp,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const event = res.value;
    partitionEvents.push(event);
    this.eventsByPartitionMap.set(partition, partitionEvents);

    return event.props;
  }

  public getEvents(query: QueryEventsDto) {
    let allEvents: AccessEvent[] = [];

    if (query.chainPartition) {
      allEvents = this.eventsByPartitionMap.get(query.chainPartition) || [];
    } else {
      for (const list of this.eventsByPartitionMap.values()) {
        allEvents.push(...list);
      }
    }

    if (query.doorId) {
      allEvents = allEvents.filter((e) => e.doorId === query.doorId);
    }
    if (query.personId) {
      allEvents = allEvents.filter((e) => e.personId === query.personId);
    }
    if (query.eventType) {
      allEvents = allEvents.filter((e) => e.eventType === query.eventType);
    }

    // Sort descending by sequence/timestamp
    allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit && query.limit > 0) {
      allEvents = allEvents.slice(0, query.limit);
    }

    return allEvents.map((e) => e.props);
  }

  public verifyChain(dto: VerifyChainDto) {
    const partitionEvents = this.eventsByPartitionMap.get(dto.chainPartition) || [];
    const res = verifyEventChain(partitionEvents);

    if (res.isOk()) {
      return {
        valid: true,
        partition: dto.chainPartition,
        verifiedCount: res.value.verifiedCount,
        startSequenceNumber: res.value.startSequenceNumber,
        endSequenceNumber: res.value.endSequenceNumber,
      };
    } else {
      // Emit a critical alert event for broken chain
      this.recordEvent({
        chainPartition: dto.chainPartition,
        eventType: 'audit.chain_broken',
        severity: 'critical',
        siteId: 'SYSTEM',
        details: {
          brokenSequenceNumber: res.error.brokenSequenceNumber,
          brokenEventId: res.error.brokenEventId,
          error: res.error.message,
        },
      });

      return {
        valid: false,
        partition: dto.chainPartition,
        brokenSequenceNumber: res.error.brokenSequenceNumber,
        brokenEventId: res.error.brokenEventId,
        message: res.error.message,
      };
    }
  }

  public purgeEvents(dto: PurgeEventsDto) {
    const cutoffTime = Date.now() - dto.olderThanDays * 86400 * 1000;
    let purgedCount = 0;

    for (const [partition, list] of this.eventsByPartitionMap.entries()) {
      const remaining = list.filter((e) => {
        if (dto.eventType && e.eventType !== dto.eventType) return true;
        const isOld = e.timestamp.getTime() < cutoffTime;
        if (isOld) purgedCount++;
        return !isOld;
      });
      this.eventsByPartitionMap.set(partition, remaining);
    }

    return {
      purgedCount,
      olderThanDays: dto.olderThanDays,
    };
  }
}
