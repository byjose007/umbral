export type AnalyticsReportId = string & { readonly __brand: 'AnalyticsReportId' };
export type SavedFilterId = string & { readonly __brand: 'SavedFilterId' };
export type TrajectoryQueryId = string & { readonly __brand: 'TrajectoryQueryId' };

export const makeAnalyticsReportId = (id: string): AnalyticsReportId => id as AnalyticsReportId;
export const makeSavedFilterId = (id: string): SavedFilterId => id as SavedFilterId;
export const makeTrajectoryQueryId = (id: string): TrajectoryQueryId => id as TrajectoryQueryId;
