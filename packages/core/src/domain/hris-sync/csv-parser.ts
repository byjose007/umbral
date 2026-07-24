import { HrisPersonRecord } from './hris-record.vo.js';
import { PersonType } from '../identity/person.entity.js';
import { HrisStatus } from './hris-record.vo.js';

export interface ParseCsvResult {
  readonly validRecords: HrisPersonRecord[];
  readonly invalidRows: Array<{ rowNumber: number; rawText: string; reason: string }>;
}

export class HrisCsvParser {
  /**
   * Parse CSV content into HRIS person records.
   * Expected CSV Header: external_ref,national_id,first_name,last_name,email,phone,person_type,site_id,status,start_date,end_date
   */
  public static parse(csvContent: string): ParseCsvResult {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { validRecords: [], invalidRows: [] };
    }

    const validRecords: HrisPersonRecord[] = [];
    const invalidRows: Array<{ rowNumber: number; rawText: string; reason: string }> = [];

    // Parse header to map column indexes
    const headerCols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/"/g, ''));
    
    const getIndex = (names: string[]) => {
      return headerCols.findIndex(c => names.includes(c));
    };

    const idxExternalRef = getIndex(['external_ref', 'externalref', 'emp_id', 'id']);
    const idxNationalId = getIndex(['national_id', 'nationalid', 'cedula', 'dni']);
    const idxFirstName = getIndex(['first_name', 'firstname', 'nombre']);
    const idxLastName = getIndex(['last_name', 'lastname', 'apellido']);
    const idxEmail = getIndex(['email', 'correo']);
    const idxPhone = getIndex(['phone', 'telefono']);
    const idxPersonType = getIndex(['person_type', 'persontype', 'tipo']);
    const idxSiteId = getIndex(['site_id', 'siteid', 'site']);
    const idxStatus = getIndex(['status', 'estado']);
    const idxStartDate = getIndex(['start_date', 'startdate', 'fecha_ingreso']);
    const idxEndDate = getIndex(['end_date', 'enddate', 'fecha_baja']);

    for (let r = 1; r < lines.length; r++) {
      const rawText = lines[r];
      const cols = rawText.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

      const externalRef = idxExternalRef >= 0 ? cols[idxExternalRef] : '';
      const nationalId = idxNationalId >= 0 ? cols[idxNationalId] : '';
      const firstName = idxFirstName >= 0 ? cols[idxFirstName] : '';
      const lastName = idxLastName >= 0 ? cols[idxLastName] : '';
      const email = idxEmail >= 0 ? cols[idxEmail] : null;
      const phone = idxPhone >= 0 ? cols[idxPhone] : null;
      const rawPersonType = idxPersonType >= 0 ? cols[idxPersonType]?.toLowerCase() : 'employee';
      const siteId = idxSiteId >= 0 ? cols[idxSiteId] : 'site-default';
      const rawStatus = idxStatus >= 0 ? cols[idxStatus]?.toUpperCase() : 'ACTIVE';
      const rawStartDate = idxStartDate >= 0 ? cols[idxStartDate] : '';
      const rawEndDate = idxEndDate >= 0 ? cols[idxEndDate] : '';

      if (!externalRef || externalRef.length === 0) {
        invalidRows.push({ rowNumber: r + 1, rawText, reason: 'Missing mandatory column external_ref' });
        continue;
      }
      if (!nationalId || nationalId.length === 0) {
        invalidRows.push({ rowNumber: r + 1, rawText, reason: 'Missing mandatory column national_id' });
        continue;
      }
      if (!firstName || !lastName) {
        invalidRows.push({ rowNumber: r + 1, rawText, reason: 'Missing mandatory first_name or last_name' });
        continue;
      }

      const personType: PersonType = ['employee', 'contractor', 'visitor'].includes(rawPersonType)
        ? (rawPersonType as PersonType)
        : 'employee';

      const status: HrisStatus = ['ACTIVE', 'TERMINATED', 'LEAVE'].includes(rawStatus)
        ? (rawStatus as HrisStatus)
        : 'ACTIVE';

      const startDate = rawStartDate ? new Date(rawStartDate) : new Date();
      const endDate = rawEndDate ? new Date(rawEndDate) : null;

      validRecords.push(
        new HrisPersonRecord({
          externalRef,
          nationalId,
          firstName,
          lastName,
          email,
          phone,
          personType,
          siteId: siteId || 'site-default',
          status,
          startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
          endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
          rawRowNumber: r + 1,
        })
      );
    }

    return { validRecords, invalidRows };
  }
}
