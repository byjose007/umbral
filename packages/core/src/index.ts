/**
 * @umbral/core — Domain foundation for UMBRAL Physical Access Control System
 */

export interface VersionInfo {
  version: string;
  name: string;
}

export const UMBRAL_CORE_VERSION: VersionInfo = {
  version: '0.1.0',
  name: '@umbral/core',
};

// Domain — Topology
export * from './domain/topology/ids.js';
export * from './domain/topology/errors.js';
export * from './domain/topology/organization.entity.js';
export * from './domain/topology/lock-profile.vo.js';
export * from './domain/topology/site.entity.js';
export * from './domain/topology/zone.entity.js';
export * from './domain/topology/controller.entity.js';
export * from './domain/topology/door.entity.js';
export * from './domain/topology/reader.entity.js';
export * from './domain/topology/door-controller.port.js';
export * from './domain/topology/simulator.adapter.js';
export * from './domain/topology/config-export.js';

// Domain — Decision Engine
export * from './domain/decision/types.js';
export * from './domain/decision/evaluate.js';
export * from './domain/decision/matrix-compiler.js';
export * from './domain/decision/schedule-evaluator.js';
export * from './domain/decision/apb-evaluator.js';
export * from './domain/decision/schedule-adapter.js';

// Domain — Identity
export * from './domain/identity/ids.js';
export * from './domain/identity/errors.js';
export * from './domain/identity/person.entity.js';
export * from './domain/identity/employment-period.entity.js';
export * from './domain/identity/absence.entity.js';
export * from './domain/identity/person-document.entity.js';
export * from './domain/identity/access-status.js';

// Domain — Credentials
export * from './domain/credentials/ids.js';
export * from './domain/credentials/errors.js';
export * from './domain/credentials/credential-hash.js';
export * from './domain/credentials/credential.entity.js';
export * from './domain/credentials/qr-signer.js';

// Domain — Access Rights
export * from './domain/access-rights/ids.js';
export * from './domain/access-rights/errors.js';
export * from './domain/access-rights/holiday-calendar.entity.js';
export * from './domain/access-rights/schedule.entity.js';
export * from './domain/access-rights/access-level.entity.js';
export * from './domain/access-rights/group.entity.js';
export * from './domain/access-rights/person-group.entity.js';

// Domain — Device Gateway
export * from './domain/device-gateway/ids.js';
export * from './domain/device-gateway/errors.js';
export * from './domain/device-gateway/mqtt-topics.js';
export * from './domain/device-gateway/device-gateway.port.js';

// Domain — Events & Audit
export * from './domain/events-audit/ids.js';
export * from './domain/events-audit/errors.js';
export * from './domain/events-audit/taxonomy.js';
export * from './domain/events-audit/hash-chain.js';
export * from './domain/events-audit/access-event.entity.js';
export * from './domain/events-audit/chain-verifier.js';

// Domain — Alerting
export * from './domain/alerting/ids.js';
export * from './domain/alerting/errors.js';
export * from './domain/alerting/pseudonymizer.js';
export * from './domain/alerting/alert-rule.entity.js';
export * from './domain/alerting/alert.entity.js';

// Domain — PWA Mobile (User Pass & Guard Console)
export * from './domain/pwa-mobile/ids.js';
export * from './domain/pwa-mobile/errors.js';
export * from './domain/pwa-mobile/offline-qr-generator.js';
export * from './domain/pwa-mobile/muster-roll.entity.js';
export * from './domain/pwa-mobile/guard-pwa.entity.js';

// Domain — User Pass (User Mobile Pass PWA)
export * from './domain/user-pass/ids.js';
export * from './domain/user-pass/errors.js';
export * from './domain/user-pass/user-pass-generator.js';
export * from './domain/user-pass/visitor-pass.entity.js';

// Domain — Workflow (Access Request)
export * from './domain/workflow/ids.js';
export * from './domain/workflow/errors.js';
export * from './domain/workflow/access-request.entity.js';
export * from './domain/workflow/required-document-check.js';

// Domain — Notifications
export * from './domain/notifications/errors.js';
export * from './domain/notifications/notification.entity.js';
export * from './domain/notifications/template-engine.js';
export * from './domain/notifications/channel-dispatcher.port.js';

// Domain — Compliance (LOPDP)
export * from './domain/compliance/ids.js';
export * from './domain/compliance/errors.js';
export * from './domain/compliance/retention-policy.entity.js';
export * from './domain/compliance/pii-audit.entity.js';
export * from './domain/compliance/arco.service.js';
export * from './domain/compliance/privacy-notice.entity.js';

// Domain — Analytics & Muster
export * from './domain/analytics/ids.js';
export * from './domain/analytics/errors.js';
export * from './domain/analytics/flow-aggregates.js';
export * from './domain/analytics/zone-occupancy.js';
export * from './domain/analytics/person-trajectory.js';
export * from './domain/analytics/anomalies-detector.js';
export * from './domain/analytics/system-health.js';
export * from './domain/analytics/reports.js';

// Domain — HRIS Sync (Import Watcher)
export * from './domain/hris-sync/ids.js';
export * from './domain/hris-sync/errors.js';
export * from './domain/hris-sync/hris-record.vo.js';
export * from './domain/hris-sync/csv-parser.js';
export * from './domain/hris-sync/watcher.port.js';
export * from './domain/hris-sync/reconciler.js';

// Crypto utilities (env-agnostic: Node.js and Browser / Service Workers)
export * from './domain/crypto-utils.js';

// Domain — Auth (Operator accounts & RBAC)
export * from './domain/auth/ids.js';
export * from './domain/auth/errors.js';
export * from './domain/auth/roles.js';
export * from './domain/auth/operator.entity.js';











