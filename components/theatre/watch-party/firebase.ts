// ══════════════════════════════════════════════════════════════════════
// WATCH PARTY → FIREBASE (project: the "party" project in ../firebase/config)
// ══════════════════════════════════════════════════════════════════════

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { PARTY_FIREBASE_CONFIG, PARTY_FIREBASE_READY, firebaseSetupHint } from '../firebase/config';

let appInstance: FirebaseApp | null = null;

function getPartyApp(): FirebaseApp {
  if (appInstance) return appInstance;
  const existing = getApps().find((a) => a.name === '[DEFAULT]');
  if (existing) {
    appInstance = existing;
    return appInstance;
  }
  const config = PARTY_FIREBASE_READY
    ? PARTY_FIREBASE_CONFIG
    : {
        apiKey: 'local-mesh-api-key-placeholder',
        authDomain: 'localhost',
        databaseURL: 'https://local-mydonkey-mesh-default-rtdb.firebaseio.com',
        projectId: 'local-mydonkey-mesh',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      };
  try {
    appInstance = initializeApp(config);
  } catch {
    try {
      appInstance = getApp();
    } catch {
      appInstance = initializeApp(config, '[DEFAULT]');
    }
  }
  return appInstance;
}

let dbInstance: Database | null = null;

export function partyFirebaseReady(): boolean {
  return PARTY_FIREBASE_READY;
}

export function partySetupHint(): string {
  return firebaseSetupHint('party');
}

/** Lazily created so a bad database URL throws where it can be reported
 *  (a room notice) instead of crashing the app while the module loads. */
export function partyDb(): Database {
  if (dbInstance) return dbInstance;
  if (!PARTY_FIREBASE_READY) {
    throw new Error(partySetupHint() || 'The Watch Party database is not configured.');
  }
  try {
    dbInstance = getDatabase(getPartyApp());
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    if (/different region/i.test(detail)) {
      throw new Error(
        'The Watch Party database URL points at the wrong region. Copy the exact URL from '
        + 'Firebase Console → Realtime Database into VITE_FIREBASE_PARTY_DATABASE_URL and redeploy '
        + '(databases outside us-central1 use <name>.<region>.firebasedatabase.app). See FIREBASE_SETUP.md step 4.',
      );
    }
    throw new Error(detail || 'The Watch Party database could not be opened.');
  }
  return dbInstance;
}

let authPromise: Promise<User> | null = null;

export function ensureFirebaseUser(): Promise<User> {
  if (!PARTY_FIREBASE_READY) return Promise.reject(new Error(partySetupHint()));
  const app = getPartyApp();
  const auth = getAuth(app);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (authPromise) return authPromise;
  authPromise = new Promise<User>((resolve, reject) => {
    let settled = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !settled) { settled = true; unsubscribe(); resolve(user); }
    }, (error) => { if (!settled) { settled = true; unsubscribe(); reject(error); } });
    void signInAnonymously(auth).catch((error) => {
      if (!settled) { settled = true; unsubscribe(); reject(error); }
    });
  }).finally(() => { authPromise = null; });
  return authPromise;
}
