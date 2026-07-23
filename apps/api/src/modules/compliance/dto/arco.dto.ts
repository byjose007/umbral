export class ArcoExportRequestDto {
  operatorId!: string;
  operatorRoles?: string[];
  justification!: string;
}

export class ArcoRectifyRequestDto {
  operatorId!: string;
  operatorRoles?: string[];
  justification!: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export class ArcoAnonymizeRequestDto {
  operatorId!: string;
  operatorRoles?: string[];
  justification!: string;
}
