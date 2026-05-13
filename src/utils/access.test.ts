import { describe, expect, it } from 'vitest';
import {
  normalizeAccessEmail,
  resolveAccessState,
  sanitizeAccessBootstrapRecord,
  sanitizeAccessRoleRecord,
  sortAccessRoles,
} from './access';

describe('access utilities', () => {
  it('normalizes email for role matching', () => {
    expect(normalizeAccessEmail(' Owner@AmySalon.com ')).toBe('owner@amysalon.com');
  });

  it('allows first authenticated account to bootstrap owner when bootstrap doc is missing', () => {
    expect(resolveAccessState('owner@amysalon.com', null, null)).toEqual({
      role: null,
      canBootstrapOwner: true,
      isAdmin: false,
      isOwner: false,
      isStaff: false,
    });
  });

  it('treats bootstrap account as admin even without explicit role doc', () => {
    expect(
      resolveAccessState(
        'owner@amysalon.com',
        { ownerEmail: 'owner@amysalon.com' },
        null
      )
    ).toEqual({
      role: 'admin',
      canBootstrapOwner: false,
      isAdmin: true,
      isOwner: true,
      isStaff: true,
    });
  });

  it('treats explicit admin role as admin even when bootstrap belongs to another account', () => {
    expect(
      resolveAccessState(
        'admin@amysalon.com',
        { ownerEmail: 'root@amysalon.com' },
        { email: 'admin@amysalon.com', role: 'admin' }
      )
    ).toEqual({
      role: 'admin',
      canBootstrapOwner: false,
      isAdmin: true,
      isOwner: true,
      isStaff: true,
    });
  });

  it('resolves owner access below admin', () => {
    expect(
      resolveAccessState(
        'owner@amysalon.com',
        { ownerEmail: 'admin@amysalon.com' },
        { email: 'owner@amysalon.com', role: 'owner' }
      )
    ).toEqual({
      role: 'owner',
      canBootstrapOwner: false,
      isAdmin: false,
      isOwner: true,
      isStaff: true,
    });
  });

  it('resolves staff access from role doc when bootstrap already exists', () => {
    expect(
      resolveAccessState(
        'staff@amysalon.com',
        { ownerEmail: 'owner@amysalon.com' },
        { email: 'staff@amysalon.com', role: 'staff' }
      )
    ).toEqual({
      role: 'staff',
      canBootstrapOwner: false,
      isAdmin: false,
      isOwner: false,
      isStaff: true,
    });
  });

  it('sanitizes bootstrap and role records', () => {
    expect(sanitizeAccessBootstrapRecord({ ownerEmail: ' Owner@AmySalon.com ' })).toEqual({
      ownerEmail: 'owner@amysalon.com',
    });

    expect(
      sanitizeAccessRoleRecord({ email: ' Admin@AmySalon.com ', role: 'admin' })
    ).toEqual({
      email: 'admin@amysalon.com',
      role: 'admin',
    });
  });

  it('sorts admin before owner before staff and then by email', () => {
    expect(
      sortAccessRoles([
        { email: 'z@amysalon.com', role: 'staff' },
        { email: 'owner@amysalon.com', role: 'owner' },
        { email: 'admin@amysalon.com', role: 'admin' },
        { email: 'a@amysalon.com', role: 'staff' },
      ])
    ).toEqual([
      { email: 'admin@amysalon.com', role: 'admin' },
      { email: 'owner@amysalon.com', role: 'owner' },
      { email: 'a@amysalon.com', role: 'staff' },
      { email: 'z@amysalon.com', role: 'staff' },
    ]);
  });
});