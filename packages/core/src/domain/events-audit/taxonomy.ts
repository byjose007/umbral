export type EventSeverity = 'info' | 'warning' | 'critical';

export type EventType =
  | 'access.granted'
  | 'access.denied'
  | 'door.opened'
  | 'door.closed'
  | 'door.forced_open'
  | 'door.held_open'
  | 'input.active'
  | 'input.inactive'
  | 'input.fault'
  | 'input.fault_cleared'
  | 'rex.activated'
  | 'device.tamper'
  | 'device.offline'
  | 'fire.release_detected'
  | 'audit.chain_broken';

export const EVENT_SEVERITIES: Record<EventType, EventSeverity> = {
  'access.granted': 'info',
  'access.denied': 'warning',
  'door.opened': 'info',
  'door.closed': 'info',
  'door.forced_open': 'critical',
  'door.held_open': 'warning',
  'input.active': 'info',
  'input.inactive': 'info',
  'input.fault': 'critical',
  'input.fault_cleared': 'info',
  'rex.activated': 'info',
  'device.tamper': 'critical',
  'device.offline': 'critical',
  'fire.release_detected': 'critical',
  'audit.chain_broken': 'critical',
};

export function getEventSeverity(eventType: EventType): EventSeverity {
  return EVENT_SEVERITIES[eventType] || 'info';
}
