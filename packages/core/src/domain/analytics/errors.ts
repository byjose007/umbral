export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AnalyticsError extends DomainError {
  constructor(message: string) {
    super(message);
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
