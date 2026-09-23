// R-PAR-5 settings over the defaults; R-PAR-1 / R-DATA-2 the PIN as a salted SHA-256 hash.
import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import {
  cleanName,
  defaultSettings,
  hashPin,
  isPin,
  isSetUp,
  loadSettings,
  saveSettings,
  setPin,
  verifyPin,
} from '../../src/data/settings';
import { practiceSettings } from '../../src/data/progress';
import { fullBalanceAnimSetting } from '../../src/data/attempts';

beforeEach(async () => {
  await db.settings.clear();
});

describe('settings (R-PAR-5)', () => {
  it('defaults: free practice always (parent decision), grouped, full level ranges, Shelly and Pip', async () => {
    const s = await loadSettings();
    expect(s).toEqual(defaultSettings());
    expect(s.freePractice).toBe('always');
    expect(s.order).toBe('grouped');
    expect(s.levelBounds.EQ).toEqual({ min: 1, max: 6 });
    expect(s.levelBounds.NC).toEqual({ min: 1, max: 5 });
    expect(s.allowSkipping).toBe(false);
    expect(s.mascotNames).toEqual({ turtle: 'Shelly', penguin: 'Pip' });
    expect(await isSetUp()).toBe(false);
  });

  it('saves a change and keeps the rest; readers see it', async () => {
    await saveSettings({ freePractice: 'never', fullBalanceAnim: true });
    await saveSettings({ levelBounds: { ...defaultSettings().levelBounds, PC: { min: 2, max: 4 } } });
    const s = await loadSettings();
    expect(s.freePractice).toBe('never');
    expect(s.levelBounds.PC).toEqual({ min: 2, max: 4 });
    expect(s.levelBounds.EQ).toEqual({ min: 1, max: 6 });
    expect((await practiceSettings()).freePractice).toBe('never');
    expect(await fullBalanceAnimSetting()).toBe(true);
  });

  it('an older row missing fields and topics is filled from the defaults', async () => {
    await db.settings.put({
      profileId: 'default',
      pinHash: '',
      levelBounds: { EQ: { min: 3, max: 6 } },
    } as never);
    const s = await loadSettings();
    expect(s.levelBounds.EQ).toEqual({ min: 3, max: 6 });
    expect(s.levelBounds.RD).toEqual({ min: 1, max: 5 });
    expect(s.currency).toBe('$');
    expect(s.mascotNames.penguin).toBe('Pip');
  });
});

describe('PIN (R-PAR-1, R-DATA-2)', () => {
  it('stores a salted SHA-256 hash, never the PIN', async () => {
    await setPin('4821');
    const stored = (await db.settings.get('default'))!.pinHash;
    expect(stored).not.toContain('4821');
    const [scheme, salt, hash] = stored.split('$');
    expect(scheme).toBe('sha256');
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toBe(createHash('sha256').update(`${salt}:4821`).digest('hex'));
    expect(await isSetUp()).toBe(true);
  });

  it('verifies the right PIN only', async () => {
    await setPin('0007');
    expect(await verifyPin('0007')).toBe(true);
    for (const p of ['0008', '7', '00070', 'abcd', '']) expect(await verifyPin(p)).toBe(false);
  });

  it('salts differ, so the same PIN hashes differently', async () => {
    expect(await hashPin('1234')).not.toBe(await hashPin('1234'));
    expect(await hashPin('1234', 'ab')).toBe(await hashPin('1234', 'ab'));
  });

  it('setting a PIN keeps the other settings', async () => {
    await saveSettings({ currency: '€' });
    await setPin('1111');
    expect((await loadSettings()).currency).toBe('€');
  });

  it('refuses a PIN that is not 4 digits', async () => {
    expect(isPin('1234')).toBe(true);
    for (const p of ['123', '12345', '12a4', ' 1234']) expect(isPin(p)).toBe(false);
    await expect(setPin('12')).rejects.toThrow();
    expect(await verifyPin('1234')).toBe(false);
  });
});

describe('mascot names (R-RWD-7)', () => {
  it('trims, collapses spaces, shortens, and falls back to the default', () => {
    expect(cleanName('  Sir   Flaps ', 'Pip')).toBe('Sir Flaps');
    expect(cleanName('   ', 'Pip')).toBe('Pip');
    expect(cleanName('A'.repeat(40), 'Pip')).toBe('A'.repeat(16));
  });
});
