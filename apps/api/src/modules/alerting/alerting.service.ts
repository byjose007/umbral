import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AlertRule,
  Alert,
  makeAlertRuleId,
  makeAlertId,
  makeSiteId,
  makeDoorId,
} from '@umbral/core';
import {
  CreateAlertRuleDto,
  EvaluateEventDto,
  AcknowledgeAlertDto,
  RevealPiiDto,
  QueryAlertsDto,
} from './dto/alerting.dto';
import { v4 as uuidv4 } from './uuid';

export interface PiiAuditRecord {
  id: string;
  alertId: string;
  operatorUser: string;
  revealedPersonId: string;
  revealedAt: Date;
}

@Injectable()
export class AlertingService {
  private readonly rulesMap = new Map<string, AlertRule>();
  private readonly alertsMap = new Map<string, Alert>();
  private readonly piiAuditLogs: PiiAuditRecord[] = [];

  public createRule(dto: CreateAlertRuleDto) {
    const id = makeAlertRuleId(uuidv4());
    const res = AlertRule.create({
      id,
      siteId: makeSiteId(dto.siteId),
      name: dto.name,
      eventType: dto.eventType,
      severity: dto.severity || 'warning',
      dedupWindowSec: dto.dedupWindowSec ?? 60,
      escalationSec: dto.escalationSec,
      preAlarmSec: dto.preAlarmSec,
      channels: dto.channels || ['websocket'],
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const rule = res.value;
    this.rulesMap.set(rule.id, rule);
    return rule.props;
  }

  public getRules(siteId?: string) {
    let rules = Array.from(this.rulesMap.values());
    if (siteId) {
      rules = rules.filter((r) => r.siteId === siteId);
    }
    return rules.map((r) => r.props);
  }

  public processEvent(dto: EvaluateEventDto) {
    const eventTime = dto.timestamp ? new Date(dto.timestamp) : new Date();

    // Check matching rules
    const matchingRules = Array.from(this.rulesMap.values()).filter(
      (r) => r.siteId === dto.siteId && r.eventType === dto.eventType
    );

    const createdAlerts: any[] = [];

    for (const rule of matchingRules) {
      // Deduplication check: active alert with same ruleId, siteId, doorId within dedupWindowSec
      const isDuplicate = Array.from(this.alertsMap.values()).some((existing) => {
        if (existing.props.ruleId !== rule.id) return false;
        if (existing.siteId !== dto.siteId) return false;
        if (dto.doorId && existing.doorId !== dto.doorId) return false;
        if (existing.status !== 'active') return false;

        const timeDiffSec = (eventTime.getTime() - existing.timestamp.getTime()) / 1000;
        return timeDiffSec <= rule.dedupWindowSec;
      });

      if (isDuplicate) {
        continue; // Skip creating duplicate alert
      }

      const alertId = makeAlertId(uuidv4());
      const alertRes = Alert.create({
        id: alertId,
        ruleId: rule.id,
        siteId: makeSiteId(dto.siteId),
        doorId: dto.doorId ? makeDoorId(dto.doorId) : null,
        eventType: dto.eventType,
        severity: rule.severity || dto.severity || 'warning',
        status: 'active',
        rawPersonId: dto.rawPersonId,
        details: dto.details || {},
        timestamp: eventTime,
      });

      if (alertRes.isOk()) {
        const alert = alertRes.value;
        this.alertsMap.set(alert.id, alert);
        createdAlerts.push(alert.props);
      }
    }

    return {
      eventProcessed: true,
      alertsGenerated: createdAlerts.length,
      alerts: createdAlerts,
    };
  }

  public acknowledgeAlert(alertId: string, dto: AcknowledgeAlertDto) {
    const alert = this.alertsMap.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    const ackRes = alert.acknowledge(dto.operatorUser);
    if (ackRes.isErr()) {
      throw new BadRequestException(ackRes.error.message);
    }

    const updatedAlert = ackRes.value;
    this.alertsMap.set(alertId, updatedAlert);
    return updatedAlert.props;
  }

  public revealPii(alertId: string, dto: RevealPiiDto) {
    const alert = this.alertsMap.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }
    if (!alert.rawPersonId) {
      throw new BadRequestException(`No person PII associated with alert ${alertId}`);
    }

    // Log PII access in immutable audit trail for DP-06 compliance
    const auditRecord: PiiAuditRecord = {
      id: uuidv4(),
      alertId,
      operatorUser: dto.operatorUser,
      revealedPersonId: alert.rawPersonId,
      revealedAt: new Date(),
    };

    this.piiAuditLogs.push(auditRecord);

    return {
      alertId,
      operatorUser: dto.operatorUser,
      pseudonymizedPersonId: alert.pseudonymizedPersonId,
      rawPersonId: alert.rawPersonId,
      revealedAt: auditRecord.revealedAt,
      auditLogId: auditRecord.id,
    };
  }

  public getAlerts(query: QueryAlertsDto) {
    let alertsList = Array.from(this.alertsMap.values());

    if (query.siteId) {
      alertsList = alertsList.filter((a) => a.siteId === query.siteId);
    }
    if (query.severity) {
      alertsList = alertsList.filter((a) => a.severity === query.severity);
    }
    if (query.status) {
      alertsList = alertsList.filter((a) => a.status === query.status);
    }

    alertsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit && query.limit > 0) {
      alertsList = alertsList.slice(0, query.limit);
    }

    // Returns pseudonymous representations by default (no rawPersonId exposed)
    return alertsList.map((a) => {
      const { rawPersonId, ...safeProps } = a.props;
      return safeProps;
    });
  }

  public getPiiAuditLogs() {
    return this.piiAuditLogs;
  }
}
