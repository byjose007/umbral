export type OperatorRole = 'admin' | 'supervisor' | 'guardia' | 'auditor';

export const OPERATOR_ROLES: readonly OperatorRole[] = [
  'admin',
  'supervisor',
  'guardia',
  'auditor',
];

export const isOperatorRole = (value: string): value is OperatorRole =>
  (OPERATOR_ROLES as readonly string[]).includes(value);
