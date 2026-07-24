import { PersonType } from '../identity/person.entity.js';

export type HrisStatus = 'ACTIVE' | 'TERMINATED' | 'LEAVE';

export interface HrisPersonRecordProps {
  readonly externalRef: string;
  readonly nationalId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly personType: PersonType;
  readonly siteId: string;
  readonly status: HrisStatus;
  readonly startDate: Date;
  readonly endDate?: Date | null;
  readonly rawRowNumber?: number;
}

export class HrisPersonRecord {
  constructor(public readonly props: HrisPersonRecordProps) {}

  get externalRef(): string { return this.props.externalRef; }
  get nationalId(): string { return this.props.nationalId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get email(): string | null { return this.props.email ?? null; }
  get phone(): string | null { return this.props.phone ?? null; }
  get personType(): PersonType { return this.props.personType; }
  get siteId(): string { return this.props.siteId; }
  get status(): HrisStatus { return this.props.status; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date | null { return this.props.endDate ?? null; }
  get isTerminated(): boolean { return this.props.status === 'TERMINATED' || (this.props.endDate !== null && this.props.endDate !== undefined && this.props.endDate <= new Date()); }
}
