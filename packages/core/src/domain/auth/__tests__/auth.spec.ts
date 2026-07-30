import { describe, it, expect } from 'vitest';
import { Operator } from '../operator.entity.js';
import { makeOperatorId } from '../ids.js';
import { makeSiteId } from '../../topology/ids.js';

describe('Auth Domain', () => {
  const siteId = makeSiteId('site-01');
  const operatorId = makeOperatorId('operator-01');

  it('creates an Operator entity correctly', () => {
    const res = Operator.create({
      id: operatorId,
      siteId,
      fullName: 'Ana Torres',
      email: 'Ana.Torres@umbral.local',
      passwordHash: 'hashed',
      role: 'admin',
    });

    expect(res.isOk()).toBe(true);
    if (res.isOk()) {
      expect(res.value.email).toBe('ana.torres@umbral.local');
      expect(res.value.canAuthenticate).toBe(true);
    }
  });

  it('rejects an invalid email', () => {
    const res = Operator.create({
      id: operatorId,
      siteId,
      fullName: 'Ana Torres',
      email: 'not-an-email',
      passwordHash: 'hashed',
      role: 'admin',
    });

    expect(res.isErr()).toBe(true);
  });

  it('rejects an invalid role', () => {
    const res = Operator.create({
      id: operatorId,
      siteId,
      fullName: 'Ana Torres',
      email: 'ana@umbral.local',
      passwordHash: 'hashed',
      role: 'ceo' as never,
    });

    expect(res.isErr()).toBe(true);
  });

  it('a disabled operator cannot authenticate', () => {
    const res = Operator.create({
      id: operatorId,
      siteId,
      fullName: 'Ana Torres',
      email: 'ana@umbral.local',
      passwordHash: 'hashed',
      role: 'guardia',
      status: 'disabled',
    });

    expect(res.isOk()).toBe(true);
    if (res.isOk()) {
      expect(res.value.canAuthenticate).toBe(false);
    }
  });

  it('withLoginRecorded returns an updated copy without mutating the original', () => {
    const operator = Operator.create({
      id: operatorId,
      siteId,
      fullName: 'Ana Torres',
      email: 'ana@umbral.local',
      passwordHash: 'hashed',
      role: 'supervisor',
    })._unsafeUnwrap();

    const loggedIn = operator.withLoginRecorded(new Date('2026-07-28T10:00:00Z'));

    expect(operator.publicProps.lastLoginAt).toBeNull();
    expect(loggedIn.publicProps.lastLoginAt).toEqual(new Date('2026-07-28T10:00:00Z'));
  });
});
