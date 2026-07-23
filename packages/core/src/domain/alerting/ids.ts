export type AlertRuleId = string & { readonly __brand: 'AlertRuleId' };
export type AlertId = string & { readonly __brand: 'AlertId' };

export const makeAlertRuleId = (id: string): AlertRuleId => id as AlertRuleId;
export const makeAlertId = (id: string): AlertId => id as AlertId;
