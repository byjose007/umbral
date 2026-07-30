export type OperatorRole = 'admin' | 'supervisor' | 'guardia' | 'auditor';

export interface Operator {
  id: string;
  siteId: string;
  fullName: string;
  email: string;
  role: OperatorRole;
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  operator: Operator;
}
