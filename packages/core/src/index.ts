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
