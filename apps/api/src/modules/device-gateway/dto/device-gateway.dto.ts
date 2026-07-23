export interface ProvisionDeviceDto {
  controllerId: string;
  certificateThumbprint: string;
}

export interface RevokeCertificateDto {
  controllerId: string;
}

export interface IngestEventDto {
  eventId: string;
  controllerId: string;
  doorId: string;
  eventType: string;
  timestamp: string; // ISO string
  details?: Record<string, unknown>;
}

export interface HeartbeatDto {
  controllerId: string;
  appliedMatrixVersion: number;
  firmwareVersion: string;
  batteryStatus?: 'ok' | 'low' | 'critical';
  tamperState?: boolean;
  deviceTimestamp: number; // epoch ms
}

export interface ReconcileMatrixDto {
  controllerId: string;
  currentServerMatrixVersion: number;
}
