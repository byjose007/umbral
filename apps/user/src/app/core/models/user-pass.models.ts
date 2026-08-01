export type AppTab = 'pass' | 'history' | 'visitors';
export type PassMode = 'normal' | 'duress';
export type VisitorStatus = 'active' | 'used' | 'expired';

export interface AccessHistoryEntry {
  id: string;
  doorLabel: string;
  eventType: 'ENTRY' | 'EXIT' | 'DENIED' | 'DURESS';
  granted: boolean;
  isDuress: boolean;
  occurredAt: Date;
}

export interface VisitorPassRecord {
  id: string;
  visitorName: string;
  visitorEmail?: string;
  validFrom: Date;
  validTo: Date;
  maxUses: number;
  usedCount: number;
  signedQrToken: string;
  shareUrl?: string;
  status: VisitorStatus;
  createdAt: Date;
}
