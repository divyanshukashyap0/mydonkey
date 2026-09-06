// Robust, zero-dependency IndexedDB storage for offline & persistent caching of catalogs and sections.
// Avoids the 5MB browser localStorage QuotaExceededError while providing instant boot times.

const DB_NAME = 'mydonkey_persistent_cache';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.reject(new Error("IndexedDB not available"));
    }
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                dbPromise = null;
                reject(request.error);
            };
        });
    }
    return dbPromise;
};

export const idbGet = async <T = any>(key: string): Promise<T | null> => {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
};

export const idbSet = async (key: string, value: any): Promise<boolean> => {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(value, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    } catch {
        return false;
    }
};

export const idbDelete = async (key: string): Promise<boolean> => {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    } catch {
        return false;
    }
};
