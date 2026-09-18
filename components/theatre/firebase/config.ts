// ══════════════════════════════════════════════════════════════════════
// AETHOFLIX ↔ FIREBASE — CONNECTION CONFIG (watch party + admin)
// ══════════════════════════════════════════════════════════════════════
// AethoFlix talks to TWO Firebase projects, each with its own Realtime
// Database:
//
//   • WATCH PARTY  → rooms, media, playback, seats, poses, bans
//                    (src/watch-party/firebase.ts, DEFAULT app)
//   • ADMIN PANEL  → page views, watch sessions/logs, reports, VIP codes,
//                    broadcast, trial grants
//                    (src/firebase/adminFirebase.ts, named app "aethoflix-admin")
//
// They stay isolated on purpose: the party keys are handed to every visitor's
// browser, while the admin project holds viewer analytics. Nothing from the
// admin project is reachable from the party project.
//
// ── WHERE THE VALUES COME FROM (highest priority first) ────────────────
//  1. Project-specific build-time env vars
//        VITE_FIREBASE_PARTY_*   → watch party
//        VITE_FIREBASE_ADMIN_*   → admin panel
//  2. Generic build-time env vars — the single-project shortcut
//        VITE_FIREBASE_*         → used for BOTH when no *_PARTY_*/*_ADMIN_*
//                                  vars are set at all
//  3. Keys pasted into this file (PASTE_HERE objects further down)
//
// Set the env vars in Vercel → Project → Settings → Environment Variables
// (and in .env.local for `npm run dev`), then redeploy. See FIREBASE_SETUP.md.
//
// These values are PUBLIC client identifiers — they are meant to ship in the
// browser bundle. Security comes from Authentication + Realtime Database
// Rules, never from hiding them.
//
// NOTE ON THE DATABASE URL: it must be copied EXACTLY from the console
// (Realtime Database → the URL above the data tree). Databases outside
// us-central1 do NOT use firebaseio.com:
//        us-central1       → https://<name>-default-rtdb.firebaseio.com
//        anywhere else     → https://<name>-default-rtdb.<region>.firebasedatabase.app
// A URL from the wrong region gives "Database lives in a different region"
// and looks exactly like an expired database — read #4 in FIREBASE_SETUP.md.
// ══════════════════════════════════════════════════════════════════════

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type PartialFirebaseConfig = Partial<FirebaseWebConfig>;

const EMPTY_CONFIG: FirebaseWebConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Vite statically replaces import.meta.env.* at build time; reading through a
// plain object keeps the lookups dynamic and type-safe.
const ENV = (import.meta.env ?? {}) as unknown as Record<string, string | undefined>;

function envText(key: string): string {
  const value = ENV[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Reads one prefix of env vars. Names match the Firebase console's
 *  "Project settings → Your apps → SDK setup and configuration" fields, in
 *  the order the console shows them. */
function fromEnv(prefix: string): PartialFirebaseConfig {
  return {
    apiKey: envText(`${prefix}API_KEY`),
    authDomain: envText(`${prefix}AUTH_DOMAIN`),
    databaseURL: envText(`${prefix}DATABASE_URL`),
    projectId: envText(`${prefix}PROJECT_ID`),
    storageBucket: envText(`${prefix}STORAGE_BUCKET`),
    messagingSenderId: envText(`${prefix}SENDER_ID`),
    appId: envText(`${prefix}APP_ID`),
  };
}

// ══════════════════════════════════════════════════════════════════════
// OPTION B — paste the keys straight into this file
// ══════════════════════════════════════════════════════════════════════
// Handy when you cannot touch Vercel env vars. Env vars always win over
// anything you write here, so leaving these empty is the normal state.
// Copy values from the console exactly as shown, including the database URL.
// ----------------------------------------------------------------------
const PARTY_PASTE_HERE: PartialFirebaseConfig = {
  // apiKey: '',
  // authDomain: '<party-project>.firebaseapp.com',
  // databaseURL: 'https://<party-db-url>',
  // projectId: '<party-project>',
  // storageBucket: '<party-project>.firebasestorage.app',
  // messagingSenderId: '',
  // appId: '',
};

const ADMIN_PASTE_HERE: PartialFirebaseConfig = {
  // apiKey: '',
  // authDomain: '<admin-project>.firebaseapp.com',
  // databaseURL: 'https://<admin-db-url>',
  // projectId: '<admin-project>',
  // storageBucket: '<admin-project>.firebasestorage.app',
  // messagingSenderId: '',
  // appId: '',
};
// ----------------------------------------------------------------------

const EMPTY_KEYS: (keyof FirebaseWebConfig)[] = [
  'apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId',
];

function hasValues(config: PartialFirebaseConfig): boolean {
  return EMPTY_KEYS.some((key) => (config[key] ?? '').trim().length > 0);
}

/** First non-empty value wins, per field — so a half-filled prefix can be
 *  completed by the next source instead of blanking the whole config. */
function resolve(...sources: PartialFirebaseConfig[]): FirebaseWebConfig {
  const out: PartialFirebaseConfig = {};
  for (const source of sources) {
    for (const key of EMPTY_KEYS) {
      const value = (source[key] ?? '').trim();
      if (value && !(out[key] ?? '').trim()) out[key] = value;
    }
  }
  return { ...EMPTY_CONFIG, ...out };
}

const GENERIC_ENV = fromEnv('VITE_FIREBASE_');
const PARTY_ENV = fromEnv('VITE_FIREBASE_PARTY_');
const ADMIN_ENV = fromEnv('VITE_FIREBASE_ADMIN_');

// Two projects configured → VITE_FIREBASE_* is ignored on purpose, so a
// leftover value can never silently point one half of the app at the wrong
// project. Only scoped vars (or the paste slots) decide.
const SCOPED_MODE = hasValues(PARTY_ENV) || hasValues(ADMIN_ENV);
const SHARED_ENV: PartialFirebaseConfig = SCOPED_MODE ? {} : GENERIC_ENV;

export const PARTY_FIREBASE_CONFIG = resolve(SHARED_ENV, PARTY_PASTE_HERE, PARTY_ENV);
export const ADMIN_FIREBASE_CONFIG = resolve(SHARED_ENV, ADMIN_PASTE_HERE, ADMIN_ENV);

/** True when this project is on the single-project shortcut. */
export const FIREBASE_SINGLE_PROJECT = !SCOPED_MODE && hasValues(GENERIC_ENV);

// ── URL shapes ─────────────────────────────────────────────────────────
// us-central1 databases use <name>.firebaseio.com; every other region uses
// <name>.<region>.firebasedatabase.app. Both are valid — only the emulator
// form (localhost) is treated separately.
const REGIONAL_DB = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.firebasedatabase\.app\/?$/i;
const US_DB = /^https:\/\/[a-z0-9-]+\.firebaseio\.com\/?$/i;
const EMULATOR_DB = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+\/?$/i;

export function isKnownDatabaseUrl(url: string): boolean {
  const value = url.trim();
  return REGIONAL_DB.test(value) || US_DB.test(value) || EMULATOR_DB.test(value);
}

/** 'us-central1' for firebaseio.com URLs, the region slug for
 *  firebasedatabase.app URLs, '' when the URL is not a database URL. */
export function firebaseRegionFromUrl(url: string): string {
  const value = url.trim();
  if (US_DB.test(value)) return 'us-central1';
  const match = value.match(REGIONAL_DB);
  if (match) return value.split('//')[1].split('.').slice(-3, -2)[0] ?? '';
  if (EMULATOR_DB.test(value)) return 'emulator';
  return '';
}

function usable(config: FirebaseWebConfig): boolean {
  // apiKey on its own is enough to make the Firebase SDK look configured, so
  // the check has to cover everything a connection actually needs.
  return config.apiKey.length >= 20 && config.projectId.length > 0 && isKnownDatabaseUrl(config.databaseURL);
}

export const PARTY_FIREBASE_READY = usable(PARTY_FIREBASE_CONFIG);
export const ADMIN_FIREBASE_READY = usable(ADMIN_FIREBASE_CONFIG);

// ── Setup hints ────────────────────────────────────────────────────────
export type FirebaseSide = 'party' | 'admin';

export function firebaseEnvKeys(side: FirebaseSide): string[] {
  const prefix = side === 'party' ? 'VITE_FIREBASE_PARTY_' : 'VITE_FIREBASE_ADMIN_';
  return ['API_KEY', 'AUTH_DOMAIN', 'DATABASE_URL', 'PROJECT_ID', 'STORAGE_BUCKET', 'SENDER_ID', 'APP_ID']
    .map((suffix) => `${prefix}${suffix}`);
}

/** One line naming exactly what is missing — shown in the UI instead of a
 *  dead button, so an unfinished setup is never mistaken for a broken app. */
export function firebaseSetupHint(side: FirebaseSide): string {
  const config = side === 'party' ? PARTY_FIREBASE_CONFIG : ADMIN_FIREBASE_CONFIG;
  const missing: string[] = [];
  let note = '';
  if (config.apiKey.length < 20) missing.push('API_KEY');
  if (!config.projectId) missing.push('PROJECT_ID');
  if (!config.databaseURL) missing.push('DATABASE_URL');
  else if (!isKnownDatabaseUrl(config.databaseURL)) {
    missing.push('DATABASE_URL');
    note = ' (that value is not a database URL — copy it exactly from Realtime Database)';
  }
  const prefix = side === 'party' ? 'VITE_FIREBASE_PARTY_' : 'VITE_FIREBASE_ADMIN_';
  if (!missing.length) return '';
  return `Firebase ${side} project is not configured yet — set ${prefix}{${missing.join(', ')}}${note} (or the shared VITE_FIREBASE_* keys) in your env, then redeploy. Steps: FIREBASE_SETUP.md.`;
}

if (import.meta.env?.DEV) {
  const notes: string[] = [];
  if (!PARTY_FIREBASE_READY) notes.push('watch party: not configured');
  else notes.push(`watch party → ${PARTY_FIREBASE_CONFIG.projectId} (${firebaseRegionFromUrl(PARTY_FIREBASE_CONFIG.databaseURL)})`);
  if (!ADMIN_FIREBASE_READY) notes.push('admin: not configured');
  else notes.push(`admin → ${ADMIN_FIREBASE_CONFIG.projectId} (${firebaseRegionFromUrl(ADMIN_FIREBASE_CONFIG.databaseURL)})`);
  console.info(`[aethoflix] Firebase: ${notes.join(' · ')}`);
}
