export function eventsTopic(controllerId: string): string {
  return `umbral/v1/controllers/${controllerId}/events`;
}

export function matrixTopic(controllerId: string): string {
  return `umbral/v1/controllers/${controllerId}/matrix`;
}

export function heartbeatTopic(controllerId: string): string {
  return `umbral/v1/controllers/${controllerId}/heartbeat`;
}

export function commandsTopic(controllerId: string): string {
  return `umbral/v1/controllers/${controllerId}/commands`;
}
