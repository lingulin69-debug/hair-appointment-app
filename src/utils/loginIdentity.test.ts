import { afterEach, describe, expect, it } from 'vitest';
import {
  REMEMBERED_LOGIN_STORAGE_KEY,
  clearRememberedLogin,
  loadRememberedLogin,
  normalizeLoginIdentifier,
  saveRememberedLogin,
} from './loginIdentity';

afterEach(() => {
  window.localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
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
});