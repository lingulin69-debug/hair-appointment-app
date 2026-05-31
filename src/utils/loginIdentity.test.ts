import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_LOGIN_SESSION_STORAGE_KEY,
  hasAcceptedLoginSession,
  activateLoginSession,
  REMEMBERED_LOGIN_STORAGE_KEY,
  clearActiveLoginSession,
  clearRememberedLogin,
  hasActiveLoginSession,
  loadRememberedLogin,
  normalizeLoginIdentifier,
  saveRememberedLogin,
} from './loginIdentity';

afterEach(() => {
  window.localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
  window.sessionStorage.removeItem(ACTIVE_LOGIN_SESSION_STORAGE_KEY);
});

describe('login identity utilities', () => {
  it('normalizes short account names to the internal login domain', () => {
    expect(normalizeLoginIdentifier(' AlasseaLin ')).toBe('alassealin@amysalon.local');
    expect(normalizeLoginIdentifier('owner@AmySalon.local')).toBe('owner@amysalon.local');
  });

  it('persists and restores remembered credentials', () => {
    saveRememberedLogin({
      identifier: 'alassealin',
      password: 'secret-pass',
    });

    expect(loadRememberedLogin()).toEqual({
      identifier: 'alassealin',
      password: 'secret-pass',
    });
  });

  it('clears invalid or removed remembered credentials', () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, JSON.stringify({ identifier: '', password: '' }));

    expect(loadRememberedLogin()).toBeNull();

    saveRememberedLogin({ identifier: '', password: '' });
    expect(window.localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY)).toBeNull();

    saveRememberedLogin({ identifier: 'alassealin', password: 'secret-pass' });
    clearRememberedLogin();
    expect(loadRememberedLogin()).toBeNull();
  });

  it('tracks the active login session in sessionStorage only', () => {
    expect(hasActiveLoginSession()).toBe(false);

    activateLoginSession();
    expect(hasActiveLoginSession()).toBe(true);

    clearActiveLoginSession();
    expect(hasActiveLoginSession()).toBe(false);
  });

  it('treats same-tab reload as an accepted login session fallback', () => {
    vi.spyOn(window.performance, 'getEntriesByType').mockReturnValue([
      { type: 'reload' } as PerformanceNavigationTiming,
    ] as unknown as PerformanceEntryList);

    expect(hasActiveLoginSession()).toBe(false);
    expect(hasAcceptedLoginSession()).toBe(true);
  });
});