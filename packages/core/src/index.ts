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




