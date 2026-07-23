import { describe, it, expect } from 'vitest';
import { AccessRequest } from '../access-request.entity.js';
import { assertRequiredDocumentsCurrent } from '../required-document-check.js';
import { makeAccessRequestId } from '../ids.js';
import { makeSiteId } from '../../topology/ids.js';
import { makeAccessLevelId } from '../../access-rights/ids.js';

describe('Workflow Domain', () => {
  const siteId = makeSiteId('site-01');
  const accessLevelId = makeAccessLevelId('al-visitors');

  function buildRequest(status?: 'requested' | 'in_review' | 'approved' | 'rejected' | 'active' | 'expired') {
    return AccessRequest.create({
      id: makeAccessRequestId('req-1'),
      siteId,
      applicantType: 'provider',
      applicantName: 'Acme Proveedores',
      requestedAccessLevelId: accessLevelId,
      reason: 'Mantenimiento de bodega',
      validFrom: new Date('2026-07-20T00:00:00Z'),
      validUntil: new Date('2026-07-21T00:00:00Z'),
      status,
    })._unsafeUnwrap();
  }

  it('creates a request in "requested" state by default', () => {
    const request = buildRequest();
    expect(request.status).toBe('requested');
  });

  it('registers the approver, date and reason on approval', () => {
    const request = buildRequest('in_review');
    const approved = request.transitionTo('approved', 'approver-1', new Date('2026-07-19T10:00:00Z'), 'Documentación en regla')._unsafeUnwrap();

    expect(approved.status).toBe('approved');
    expect(approved.props.decidedBy).toBe('approver-1');
    expect(approved.props.decisionReason).toBe('Documentación en regla');
    expect(approved.history.length).toBe(1);
  });

  it('rejects an invalid transition from rejected directly to active', () => {
    const request = buildRequest('rejected');
    const result = request.transitionTo('active', 'approver-1');

    expect(result.isErr()).toBe(true);
  });

  it('blocks approval when a required document is expired', () => {
    const documents = [
      { docType: 'insurance_policy' as const, expiresAt: new Date('2026-01-01'), blocksAccessOnExpiry: true },
    ];

    const check = assertRequiredDocumentsCurrent(documents, ['insurance_policy'], new Date('2026-07-20'));
    expect(check.isErr()).toBe(true);
  });

  it('lets a visit access expire on its own once validity ends', () => {
    const request = buildRequest('active');
    expect(request.isActiveAt(new Date('2026-07-20T12:00:00Z'))).toBe(true);
    expect(request.isActiveAt(new Date('2026-07-22T00:00:00Z'))).toBe(false);
  });
});
