import { HrisPersonRecord } from './hris-record.vo.js';

export interface HrisSourceFile {
  readonly filename: string;
  readonly content: string;
  readonly fetchedAt: Date;
}

export interface HrisSourceAdapter {
  readonly name: string;
  readonly sourceType: 'FOLDER_WATCHER' | 'SFTP' | 'API_LDAP';
  fetchPendingFiles(): Promise<HrisSourceFile[]>;
  fetchRemoteRecords?(): Promise<HrisPersonRecord[]>;
}
