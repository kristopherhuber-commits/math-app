// Parent settings (R-PAR-5) with the config defaults, and the PIN (R-PAR-1, R-DATA-2). The PIN is a
// child gate, not security: it is stored as a salted SHA-256 hash only so it isn't in plain text.
import { config, TOPICS, type TopicId } from '../engine/config';
import { defaultBounds, type LevelBounds } from '../engine/adaptive';
import { db, PROFILE_ID, type Settings } from './db';

export type EditableSettings = Omit<Settings, 'profileId' | 'pinHash'>;

export function defaultSettings(): Settings {
  return {
    profileId: PROFILE_ID,
    pinHash: '',
    freePractice: config.settings.freePractice,
    order: config.settings.order,
    levelBounds: Object.fromEntries(TOPICS.map((t) => [t, defaultBounds(t)])) as Record<TopicId, LevelBounds>,
    allowSkipping: config.eq.allowSkippingDefault,
    fullBalanceAnim: config.eq.fullBalanceAnimDefault,
    naturalIncludesZero: config.settings.naturalIncludesZero,
    sound: true,
    reduceMotion: false,
    currency: config.settings.currency,
    mascotNames: { ...config.settings.mascotNames },
  };
}

/** The stored settings over the defaults (older rows may lack fields or topics). */
export async function loadSettings(): Promise<Settings> {
  const d = defaultSettings();
  const s = await db.settings.get(PROFILE_ID);
  if (!s) return d;
  return {
    ...d,
    ...s,
    levelBounds: { ...d.levelBounds, ...s.levelBounds },
    mascotNames: { ...d.mascotNames, ...s.mascotNames },
  };
}

export async function saveSettings(patch: Partial<EditableSettings>): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const next = { ...(await loadSettings()), ...patch, profileId: PROFILE_ID };
    await db.settings.put(next);
    return next;
  });
}

/** First run is finished once the parent has set a PIN (R-PAR-1). */
export async function isSetUp(): Promise<boolean> {
  return ((await db.settings.get(PROFILE_ID))?.pinHash ?? '') !== '';
}

export const isPin = (pin: string): boolean => pin.length === config.parent.pinLength && /^\d+$/.test(pin);

const hex = (b: ArrayBuffer | Uint8Array) =>
  [...(b instanceof Uint8Array ? b : new Uint8Array(b))].map((x) => x.toString(16).padStart(2, '0')).join('');

/** `sha256$<salt>$<hash>` (R-DATA-2, Web Crypto). */
export async function hashPin(pin: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return `sha256$${salt}$${hex(digest)}`;
}

export async function setPin(pin: string): Promise<void> {
  if (!isPin(pin)) throw new Error('A PIN is 4 digits');
  const pinHash = await hashPin(pin);
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ ...(await loadSettings()), pinHash });
  });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = (await db.settings.get(PROFILE_ID))?.pinHash ?? '';
  const [scheme, salt] = stored.split('$');
  if (scheme !== 'sha256' || !salt || !isPin(pin)) return false;
  return (await hashPin(pin, salt)) === stored;
}

/** R-RWD-7: a name is trimmed and shortened; a blank one falls back to the default. */
export function cleanName(name: string, fallback: string): string {
  const t = name.trim().replace(/\s+/g, ' ').slice(0, config.parent.maxNameLength).trim();
  return t || fallback;
}
