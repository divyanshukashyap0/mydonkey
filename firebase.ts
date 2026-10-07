import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Safe Analytics initialization - prevents GTM 404 errors if measurementId is a placeholder or blocked
export let analytics: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then(supported => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Analytics disabled or blocked by client
      }
    }
  }).catch(() => {});
}

// Resilient Firestore initialization:
// Uses persistentMultipleTabManager so multi-tab, browser navigation, and HMR reloads coordinate safely without "Target ID already exists" collisions.
// If IndexedDB storage is restricted or blocked by browser Tracking Prevention (Edge/Safari), gracefully falls back to memoryLocalCache.
let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  try {
    firestoreDb = getFirestore(app);
  } catch {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  }
}
export const db = firestoreDb;