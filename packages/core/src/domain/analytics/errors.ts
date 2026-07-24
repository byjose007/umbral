import { DomainError } from '../topology/errors.js';
export { DomainError };

export class AnalyticsError extends DomainError {
  constructor(message: string) {
    super('ANALYTICS_ERROR', message);
    this.name = 'AnalyticsError';
  }
}

export class UnauthorizedTrajectoryAccessError extends AnalyticsError {
  constructor(operatorId: string, targetPersonId: string) {
    super(`Operator '${operatorId}' is not authorized to query trajectory for person '${targetPersonId}'`);
  }
}

export class AnalyticsAggregationError extends AnalyticsError {
  constructor(reason: string) {
    super(`Analytics aggregation failed: ${reason}`);
  }
}

export class ReportExecutionError extends AnalyticsError {
  constructor(reason: string) {
    super(`Report execution failed: ${reason}`);
  }
}
