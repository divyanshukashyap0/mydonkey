import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import {
    Content,
    User as AppUser,
    SiteSettings,
    Section,
    Profile,
    Notification,
    Plan,
    Subscription,
    PaymentMethod,
    Invoice,
    Device,
    ContentRequest,
    Page,
} from '../types';
import Loader from '../components/Loader';
import { auth, db } from '../firebase';
import { sendSubscriptionEmail } from '../utils/emailService';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    User as FirebaseUser,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    sendPasswordResetEmail,
    updateEmail,
    deleteUser,
    setPersistence,
    browserLocalPersistence,
    signInAnonymously
} from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    where,
    serverTimestamp,
    getDocsFromCache,
    increment,
} from 'firebase/firestore';

interface StoreContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithApple: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => void;
    content: Content[];
    rawContent: Content[];
    exclusiveContent: Content[];
    users: AppUser[];
    currentUser: AppUser | null;
    currentProfile: Profile | null;
    userProfiles: Profile[];
    settings: SiteSettings;
    sections: Section[];
    plans: Plan[];
    notifications: Notification[];
    addContent: (item: Content) => Promise<void>;
    updateContent: (id: string, updates: Partial<Content>) => Promise<void>;
    deleteContent: (id: string) => Promise<void>;
    updateSettings: (updates: Partial<SiteSettings>) => Promise<void>;
    updateSections: (sections: Section[]) => Promise<void>;
    toggleSectionVisibility: (id: string) => Promise<void>;
    updateUser: (updates: Partial<AppUser>) => Promise<void>;
    toggleWatchlist: (contentId: string) => Promise<void>;
    switchProfile: (profileId: string | null | Profile) => void;
    addProfile: (name: string, isKids: boolean, avatarUrl: string) => Promise<Profile | void>;
    updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
    deleteProfile: (profileId: string) => Promise<void>;
    updatePlaybackProgress: (movieId: string, progress: number, stoppedAt: number, duration: number) => Promise<void>;
    updateUserEmail: (newEmail: string) => Promise<void>;
    triggerPasswordReset: () => Promise<void>;
    updateSubscriptionPlan: (planId: string, paymentResponse?: any) => Promise<void>;
    addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
    deletePaymentMethod: (id: string) => Promise<void>;
    getBillingHistory: () => Promise<Invoice[]>;
    getDevices: () => Promise<Device[]>;
    logoutDevice: (deviceId: string) => Promise<void>;
    logoutAllDevices: () => Promise<void>;
    updateProfileAvatar: (url: string) => Promise<void>;
    unlockContent: (code: string) => Promise<{ success: boolean; contentId?: string; message: string }>;
    markNotificationAsRead: (id: string) => Promise<void>;
    isInstallable: boolean;
    isIOS: boolean;
    installPwa: () => void;
    contentRequests: ContentRequest[];
    submitContentRequest: (title: string) => Promise<void>;
    updateContentRequest: (id: string, updates: Partial<ContentRequest>) => Promise<void>;
    updateContentDuration: (id: string, duration: string) => Promise<void>;
    pages: Page[];
    addPage: (page: Page) => Promise<void>;
    updatePage: (id: string, updates: Partial<Page>) => Promise<void>;
    deletePage: (id: string) => Promise<void>;
    incrementViews: (contentId: string) => Promise<void>;
    incrementLikes: (contentId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: "MY DONKEY",
    heroVideoQuality: 'hd1080',
    maintenanceMode: false,
    theme: 'default',
    websiteFont: 'Inter',
    rankFont: 'Anton',
    heroFont: 'Inter',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    linkedinUrl: ''
};

export const PERMANENT_ADMINS = ['divyanshukashyap2430955@gmail.com', 'divyanshu00884466@gmail.com'];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [content, setContent] = useState<Content[]>([]);
    // Load cached settings/plans if available
    const [settings, setSettings] = useState<SiteSettings>(() => {
        const cached = localStorage.getItem('globalSettings');
        return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
    });

    const [sections, setSections] = useState<Section[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);

    // Load cached plans if available
    const [plans, setPlans] = useState<Plan[]>(() => {
        const cached = localStorage.getItem('cachedPlans');
        return cached ? JSON.parse(cached) : [];
    });
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [contentRequests, setContentRequests] = useState<ContentRequest[]>([]);
    const [pages, setPages] = useState<Page[]>([]);

    // Track versions in memory to prevent infinite loops if LocalStorage fails
    const localContentVersionRef = React.useRef(parseInt(localStorage.getItem('contentVersion') || '0'));
    const localSectionsVersionRef = React.useRef(parseInt(localStorage.getItem('sectionsVersion') || '0'));

    // --- Theme Application ---
    useEffect(() => {
        if (settings.theme === 'luxury') {
            document.body.classList.add('theme-luxury');
        } else {
            document.body.classList.remove('theme-luxury');
        }
    }, [settings.theme]);

    // --- PWA Installation Logic ---
    useEffect(() => {
        const checkIOS = () => {
            // @ts-ignore
            const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            setIsIOS(isIOSDevice);

            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            if (isIOSDevice && !isStandalone) {
                setIsInstallable(true);
            }
        };

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        checkIOS();

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installPwa = async () => {
        if (isIOS) {
            alert("To install My Donkey on your iPhone/iPad:\n\n1. Tap the 'Share' icon (square with arrow) at the bottom.\n2. Scroll down and tap 'Add to Home Screen'.\n3. Tap 'Add' to confirm.");
            return;
        }

        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
    };

    // 1. Auth Listener
    useEffect(() => {
        const initAuth = async () => {
            try {
                await setPersistence(auth, browserLocalPersistence);

                // Process redirect result if any
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    // The onAuthStateChanged listener will pick this up automatically
                }
            } catch (error) {
                // Auth initialization error - silent fail
            }
        };

        initAuth();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setFbUser(firebaseUser);

            try {
                if (firebaseUser) {
                    // Check for Anonymous Guest
                    // Check for Anonymous Guest
                    if (firebaseUser.isAnonymous) {
                        const guestUid = firebaseUser.uid;
                        const guestEmail = `guest-${guestUid.substring(0, 6)}@mydonkey.in`;

                        // Check if guest doc already exists (re-login)
                        const userRef = doc(db, 'users', guestUid);
                        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', guestUid))); // Just check doc ref directly below

                        // We can just flow into the main logic, but let's pre-set the currentUser object
                        // so we don't rely on the 'exists' check later which might confuse email.
                        // Actually, easiest is to just treat them as a user with a special email.

                        // Let's modify the EXISTING flow below to handle anonymous email.
                    }

                    // OPTIMISTIC UPDATE: Prevent "Login Page" flash by setting auth state immediately
                    // This ensures that even if DB fetch is slow/times out, we show ProfileSelection (loading) instead of Login

                    const isGuest = firebaseUser.isAnonymous;
                    const userEmail = isGuest ? `guest-${firebaseUser.uid.substring(0, 6)}@mydonkey.in` : (firebaseUser.email || '');

                    // Check for Permanent Admin
                    const isPermanentAdmin = PERMANENT_ADMINS.includes(userEmail);
                    const role = isPermanentAdmin ? 'admin' : (isGuest ? 'guest' : 'user');

                    const tempUser: AppUser = {
                        uid: firebaseUser.uid,
                        email: userEmail,
                        name: firebaseUser.displayName || userEmail.split('@')[0],
                        plan: 'Free',
                        role: role,
                        status: 'active',
                        lastLoginAt: new Date().toISOString(),
                        isGuest
                    };
                    setCurrentUser(tempUser);
                    setIsAuthenticated(true);

                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        const newAppUser: AppUser = {
                            uid: firebaseUser.uid,
                            email: userEmail,
                            name: firebaseUser.displayName || userEmail.split('@')[0],
                            plan: 'Free',
                            role: role, // Use calculated role
                            status: 'active',
                            lastLoginAt: new Date().toISOString(),
                            isGuest
                        };
                        await setDoc(userRef, newAppUser);

                        // Create default profile
                        const profileId = isGuest ? 'guest' : 'main';
                        const defaultProfile: Profile = {
                            id: profileId,
                            name: isGuest ? 'Guest' : (firebaseUser.displayName || 'Me'),
                            avatarUrl: isGuest
                                ? 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                                : '/Mydonkey%20user.jpg',
                            isKids: false,
                            myList: []
                        };
                        await setDoc(doc(db, 'users', firebaseUser.uid, 'profiles', profileId), defaultProfile);
                        setCurrentProfile(defaultProfile); // Set immediately for guests
                        setCurrentUser(newAppUser);
                    } else {
                        // Backfill name if missing for existing users
                        const userData = userSnap.data() as AppUser;

                        // Force Admin Role for Permanent Admins
                        if (isPermanentAdmin && userData.role !== 'admin') {
                            await setDoc(userRef, { role: 'admin' }, { merge: true });
                            userData.role = 'admin';
                        }

                        if (!userData.name) {
                            await setDoc(userRef, {
                                name: firebaseUser.displayName || userEmail.split('@')[0]
                            }, { merge: true });
                        }
                        // Check token version to force logout if needed
                        const localTokenVersion = localStorage.getItem('tokenVersion');
                        if (userData.tokenVersion && localTokenVersion && parseInt(localTokenVersion) < userData.tokenVersion) {
                            await signOut(auth);
                            // Cleanup happens via auth listener
                            return;
                        }
                        if (userData.tokenVersion) {
                            localStorage.setItem('tokenVersion', userData.tokenVersion.toString());
                        }

                        setCurrentUser(userData);

                        // If guest, auto-select profile
                        if (isGuest) {
                            const profilesSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'profiles'));
                            if (!profilesSnap.empty) {
                                setCurrentProfile(profilesSnap.docs[0].data() as Profile);
                            }
                        }
                    }

                    // setIsAuthenticated(true); // Already set optimistically
                } else {
                    setCurrentUser(null);
                    setCurrentProfile(null);
                    setUserProfiles([]);
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);

                // CRITICAL FIX: If we have a firebaseUser but DB failed, 
                // we should STILL treat them as authenticated to avoid login loops.
                // We'll just have incomplete data until a retry or reload happens.
                if (firebaseUser) {
                    // Create a temporary fallback user object so the app doesn't crash
                    const fallbackUser: AppUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        plan: 'Free',
                        role: 'user',
                        status: 'active',
                        lastLoginAt: new Date().toISOString()
                    };
                    setCurrentUser(fallbackUser);
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
            } finally {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Data Sync Listeners
    // 2. Data Sync Listeners - Optimized with Cache-First Strategy
    useEffect(() => {
        // A. Settings Listener (Single Doc Read - Cheap)
        // This acts as the "Signal" for other data updates
        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), async (docSnap) => {
            if (docSnap.exists()) {
                const serverSettings = docSnap.data() as SiteSettings;
                setSettings(serverSettings);
                try {
                    localStorage.setItem('globalSettings', JSON.stringify(serverSettings));
                } catch (e) { console.warn("LS Full (Settings)", e); }

                // B. Content Sync Logic
                // Use Memory Ref as the source of truth for "current local version"
                const currentLocalContentVersion = localContentVersionRef.current;
                const serverContentVersion = Number(serverSettings.contentVersion || 0);

                const cachedContentStr = localStorage.getItem('cachedContent');

                if (serverContentVersion !== currentLocalContentVersion || !cachedContentStr) {
                    console.log(`[Cache] Updating Content (Server: ${serverContentVersion} vs Local: ${currentLocalContentVersion}). Reason: ${!cachedContentStr ? 'No Cache' : 'Version Mismatch'}`);

                    // Fetch fresh data with Catalog Optimization (1 read vs N reads)
                    let freshContent: Content[] = [];
                    try {
                        const catalogSnap = await getDoc(doc(db, 'catalogs', 'global'));
                        if (catalogSnap.exists()) {
                            console.log("[Cache] Catalog document found. Using optimized fetch.");
                            freshContent = catalogSnap.data().items || [];
                        } else {
                            console.log("[Cache] Catalog document not found. Falling back to full collection fetch.");
                            const contentSnap = await getDocs(collection(db, 'content'));
                            freshContent = contentSnap.docs.map(d => ({ ...d.data(), id: d.id } as Content));
                        }
                    } catch (err) {
                        console.warn("Network fetch failed (Quota/Offline). Trying Cache...", err);
                        try {
                            const contentSnap = await getDocsFromCache(collection(db, 'content'));
                            freshContent = contentSnap.docs.map(d => ({ ...d.data(), id: d.id } as Content));
                            console.log(`[Cache] Recovered ${freshContent.length} items from offline cache.`);
                        } catch (cacheErr) {
                            console.error("Cache recovery failed:", cacheErr);
                            // Last resort: Keep existing state or empty
                        }
                    }

                    // Update Cache & State
                    setContent(freshContent);

                    // Update Memory Ref IMMEDIATELY to stop re-fetches
                    localContentVersionRef.current = serverContentVersion;

                    try {
                        localStorage.setItem('cachedContent', JSON.stringify(freshContent));
                        localStorage.setItem('contentVersion', serverContentVersion.toString());
                    } catch (e) {
                        console.error("LocalStorage Write Failed (Quota Exceeded). Content updated in memory only.", e);
                    }
                } else {
                    console.log(`[Cache] Content up to date (v${currentLocalContentVersion}). Loading from Cache.`);
                    // Load from Cache
                    if (cachedContentStr) {
                        try {
                            const parsedContent = JSON.parse(cachedContentStr);
                            setContent(parsedContent);
                        } catch (e) {
                            console.error("Error parsing cached content:", e);
                        }
                    }
                }

                // C. Sections Sync Logic
                const currentLocalSectionsVersion = localSectionsVersionRef.current;
                const serverSectionsVersion = Number(serverSettings.sectionsVersion || 0);
                const cachedSectionsStr = localStorage.getItem('cachedSections');

                // FORCE UPDATE logic: If (Version Mismatch) OR (No Cache) OR (Sections Length is 0 in state/cache [we check string length for speed])
                // This ensures that if the user has no sections, we always try to fetch at least once.
                const shouldFetchSections =
                    serverSectionsVersion !== currentLocalSectionsVersion ||
                    !cachedSectionsStr ||
                    cachedSectionsStr.length < 5; // Empty array "[]" is length 2

                if (shouldFetchSections) {
                    console.log(`[Cache] Updating Sections. Reason: ${serverSectionsVersion !== currentLocalSectionsVersion ? 'Version Mismatch' : 'Missing/Empty Cache'}`);
                    let freshSections: Section[] = [];
                    try {
                        const sectionsSnap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
                        freshSections = sectionsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Section));
                    } catch (err) {
                        console.warn("Sections fetch failed. Trying Cache...", err);
                        try {
                            const sectionsSnap = await getDocsFromCache(query(collection(db, 'sections'), orderBy('order')));
                            freshSections = sectionsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Section));
                        } catch (cacheErr) { console.error(cacheErr); }
                    }

                    setSections(freshSections);

                    // Update Memory Ref IMMEDIATELY
                    localSectionsVersionRef.current = serverSectionsVersion;

                    try {
                        localStorage.setItem('cachedSections', JSON.stringify(freshSections));
                        localStorage.setItem('sectionsVersion', serverSectionsVersion.toString());
                    } catch (e) { console.warn("LS Full (Sections)", e); }
                } else {
                    console.log(`[Cache] Sections up to date (v${currentLocalSectionsVersion}). Loading from Cache.`);
                    if (cachedSectionsStr) {
                        setSections(JSON.parse(cachedSectionsStr));
                    }
                }
            }
        }, (error) => {
            console.error("Settings Listener Failed (Quota/Offline). Initiating Safe Mode Load.", error);
            // FAILSAFE: Try to load from LocalStorage / Cache anyway
            const cachedContentStr = localStorage.getItem('cachedContent');
            if (cachedContentStr) {
                try {
                    setContent(JSON.parse(cachedContentStr));
                    console.log("Safe Mode: Loaded Content from LocalStorage.");
                } catch (e) { console.error("Safe Mode Content Parse Failed", e); }
            } else {
                // Try Firestore Cache if LS is empty
                getDocsFromCache(collection(db, 'content')).then(snap => {
                    if (!snap.empty) {
                        setContent(snap.docs.map(d => ({ ...d.data(), id: d.id } as Content)));
                        console.log("Safe Mode: Loaded Content from Firestore Cache.");
                    }
                }).catch(e => console.error("Safe Mode Firestore Cache Failed", e));
            }

            const cachedSectionsStr = localStorage.getItem('cachedSections');
            if (cachedSectionsStr) {
                try {
                    setSections(JSON.parse(cachedSectionsStr));
                    console.log("Safe Mode: Loaded Sections from LocalStorage.");
                } catch (e) { console.error("Safe Mode Sections Parse Failed", e); }
            } else {
                getDocsFromCache(query(collection(db, 'sections'), orderBy('order'))).then(snap => {
                    if (!snap.empty) {
                        setSections(snap.docs.map(d => ({ ...d.data(), id: d.id } as Section)));
                        console.log("Safe Mode: Loaded Sections from Firestore Cache.");
                    }
                }).catch(e => console.error("Safe Mode Sections Cache Failed", e));
            }
        });

        // Keep Plans & Notifications as real-time for now (low frequency updates, critical for billing)
        const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Plan));
            setPlans(data);
            try {
                localStorage.setItem('cachedPlans', JSON.stringify(data));
            } catch (e) { }
        }, (error) => {
            console.error("Plans Sync Error (Quota/Offline):", error);
        });

        const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (snap) => {
            setNotifications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification)));
        }, (error) => {
            console.error("Notifications Sync Error:", error);
        });

        const unsubPages = onSnapshot(collection(db, 'pages'), (snap) => {
            setPages(snap.docs.map(d => ({ ...d.data(), id: d.id } as Page)));
        }, (error) => {
            console.error("Pages Sync Error:", error);
        });

        let unsubUsers = () => { };
        if (currentUser?.role === 'admin') {
            unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
                setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser)));
            }, (error) => {
                console.error("Error fetching users:", error);
            });
        }

        return () => {
            unsubSettings();
            unsubPlans();
            unsubNotifs();
            unsubPages();
            unsubUsers();
        };
    }, [currentUser?.role]);

    // 3. User Specific Sync
    useEffect(() => {
        if (!fbUser) return;

        const unsubUserDoc = onSnapshot(doc(db, 'users', fbUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as AppUser;
                if (data.role === 'admin' || !currentUser) setCurrentUser(data);
            }
        });

        const unsubProfiles = onSnapshot(collection(db, 'users', fbUser.uid, 'profiles'), (snap) => {
            const profiles = snap.docs.map(d => d.data() as Profile);
            setUserProfiles(profiles);

            if (currentProfile) {
                const updated = profiles.find(p => p.id === currentProfile.id);
                if (updated) setCurrentProfile(updated);
            }
        });

        return () => {
            unsubUserDoc();
            unsubProfiles();
        };
    }, [fbUser, currentProfile?.id]);

    // 4. Activity Tracker (Throttled)
    // Use a ref for in-memory throttling fallback if LocalStorage fails
    const lastActivityRef = React.useRef<number>(0);

    useEffect(() => {
        if (!fbUser) return;

        const updateActivity = async () => {
            const now = Date.now();
            const localLastUpdate = parseInt(localStorage.getItem('lastActivityUpdate') || '0');
            // Use the greater of local storage or memory ref (handling LS failure)
            const lastUpdate = Math.max(localLastUpdate, lastActivityRef.current);

            // Update only if more than 5 minutes have passed
            if (now - lastUpdate > 5 * 60 * 1000) {
                try {
                    await updateDoc(doc(db, 'users', fbUser.uid), {
                        lastActiveAt: new Date().toISOString()
                    });
                    lastActivityRef.current = now; // Update memory ref
                    try {
                        localStorage.setItem('lastActivityUpdate', now.toString());
                    } catch (e) {
                        console.warn("Failed to save activity timestamp to LS (likely full). Using memory throttle.", e);
                    }
                } catch (error) {
                    // Ignore quota errors or network issues for background updates
                    console.warn("Failed to update activity status:", error);
                }
            }
        };

        const handleActivity = () => {
            updateActivity();
        };

        window.addEventListener('click', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        // Initial update
        updateActivity();

        return () => {
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
        };
    }, [fbUser]);

    // Methods
    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

        // on mobile: typically redirect is preferred, but for local debugging/PWA contexts, popup often works better 
        // or avoids domain mismatch errors.
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Popup login failed, trying redirect override:", error);
            if (isMobile && error.code === 'auth/popup-blocked') {
                await signInWithRedirect(auth, provider);
            } else {
                throw error;
            }
        }
    };

    const loginWithApple = async () => {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');

        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Apple login failed:", error);
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

            // Fallback to redirect if popup is blocked (common on mobile)
            if (isMobile && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')) {
                await signInWithRedirect(auth, provider);
            } else if (error.code === 'auth/operation-not-allowed') {
                throw new Error("Apple Sign-In is not enabled in the database. Please contact support.");
            } else {
                throw error;
            }
        }
    };

    const loginAsGuest = async () => {
        await signInAnonymously(auth);
    };

    const logout = async () => {
        if (fbUser && !fbUser.isAnonymous) {
            await updateDoc(doc(db, 'users', fbUser.uid), { lastLogoutAt: new Date().toISOString() });
        }
        await signOut(auth);
        setCurrentProfile(null);
        localStorage.removeItem('selectedProfileId');
        // window.location.reload(); // Removed to prevent full page refresh
    };

    const addContent = async (item: Content) => {
        await setDoc(doc(db, 'content', item.id), item);
    };

    const updateContent = async (id: string, updates: Partial<Content>) => {
        await updateDoc(doc(db, 'content', id), updates);
        // Optimized: Bump global content version to trigger sync across all users
        const newVersion = Date.now();
        await updateSettings({ contentVersion: newVersion });
    };

    const deleteContent = async (id: string) => {
        await deleteDoc(doc(db, 'content', id));
    };

    const updateSettings = async (updates: Partial<SiteSettings>) => {
        await setDoc(doc(db, 'settings', 'global'), updates, { merge: true });
    };

    const updateSections = async (newSections: Section[]) => {
        for (const s of newSections) {
            await setDoc(doc(db, 'sections', s.id), s);
        }
    };

    const toggleSectionVisibility = async (id: string) => {
        const section = sections.find(s => s.id === id);
        if (section) {
            await updateDoc(doc(db, 'sections', id), { enabled: !section.enabled });
        }
    };

    const updateUser = async (updates: Partial<AppUser>) => {
        if (fbUser) {
            await updateDoc(doc(db, 'users', fbUser.uid), updates);
        }
    };

    const switchProfile = (profileOrId: string | null | Profile) => {
        if (!profileOrId) {
            setCurrentProfile(null);
            localStorage.removeItem('selectedProfileId');
            return;
        }

        if (typeof profileOrId === 'object') {
            setCurrentProfile(profileOrId);
            localStorage.setItem('selectedProfileId', profileOrId.id);
            return;
        }

        const profileId = profileOrId;
        const profile = userProfiles.find(p => p.id === profileId);
        if (profile) {
            setCurrentProfile(profile);
            localStorage.setItem('selectedProfileId', profileId);
        }
    };

    const addProfile = async (name: string, isKids: boolean, avatarUrl: string) => {
        if (!fbUser) return;
        const id = `profile_${Date.now()}`;
        const newProfile: Profile = { id, name, isKids, avatarUrl, myList: [] };
        await setDoc(doc(db, 'users', fbUser.uid, 'profiles', id), newProfile);
        return newProfile;
    };

    const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
        if (!fbUser) return;
        await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', profileId), updates);

        // Update local state if it's the current profile
        if (currentProfile?.id === profileId) {
            setCurrentProfile({ ...currentProfile, ...updates });
        }
    };

    const deleteProfile = async (profileId: string) => {
        if (!fbUser) return;
        await deleteDoc(doc(db, 'users', fbUser.uid, 'profiles', profileId));
        if (currentProfile?.id === profileId) {
            setCurrentProfile(null);
            localStorage.removeItem('selectedProfileId');
        }
    };

    const toggleWatchlist = async (contentId: string) => {
        if (!fbUser || !currentProfile) return;
        const isAdded = currentProfile.myList.includes(contentId);
        const newList = isAdded
            ? currentProfile.myList.filter(id => id !== contentId)
            : [...currentProfile.myList, contentId];

        await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id), { myList: newList });
    };

    const updatePlaybackProgress = async (movieId: string, progress: number, stoppedAt: number, duration: number) => {
        if (!fbUser || !currentUser) return;
        const history = currentUser.continueWatching || [];
        const existingIdx = history.findIndex(h => h.movieId === movieId);
        const newEntry = {
            movieId,
            progress,
            stoppedAt,
            duration,
            lastWatchedAt: new Date().toISOString()
        };
        let updatedHistory = [...history];
        if (existingIdx > -1) updatedHistory[existingIdx] = newEntry;
        else updatedHistory.unshift(newEntry);
        updatedHistory = updatedHistory.slice(0, 20);
        await updateUser({ continueWatching: updatedHistory });
    };

    // --- New Account Management Methods ---

    const updateUserEmail = async (newEmail: string) => {
        if (!fbUser) return;
        await updateEmail(fbUser, newEmail);
        await updateUser({ email: newEmail });
    };

    const triggerPasswordReset = async () => {
        if (!fbUser || !fbUser.email) return;
        await sendPasswordResetEmail(auth, fbUser.email);
    };



    // ... existing imports

    // Inside StoreProvider logic (find updateSubscriptionPlan)

    const updateSubscriptionPlan = async (planId: string, paymentResponse?: any) => {
        if (!fbUser) return;
        const plan = plans.find(p => p.id === planId);
        if (!plan) throw new Error("Plan not found");

        await updateUser({ plan: plan.name, subscriptionStatus: 'active' });

        const invoice: Invoice = {
            id: `inv_${Date.now()}`,
            amount: plan.price,
            currency: 'INR', // Assuming INR based on mock data
            date: new Date().toISOString(),
            status: 'paid',
            planName: plan.name,
            periodStart: new Date().toISOString(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            pdfUrl: paymentResponse?.razorpay_payment_id ? `Ref: ${paymentResponse.razorpay_payment_id}` : undefined
        };
        await setDoc(doc(db, 'users', fbUser.uid, 'billing', invoice.id), invoice);

        // Send Email Notification
        await sendSubscriptionEmail(fbUser.email || '', plan.name, plan.price.toString());
    };

    const addPaymentMethod = async (method: Omit<PaymentMethod, 'id'>) => {
        if (!fbUser) return;
        const id = `pm_${Date.now()}`;
        await setDoc(doc(db, 'users', fbUser.uid, 'paymentMethods', id), { ...method, id });
    };

    const deletePaymentMethod = async (id: string) => {
        if (!fbUser) return;
        await deleteDoc(doc(db, 'users', fbUser.uid, 'paymentMethods', id));
    };

    const getBillingHistory = async (): Promise<Invoice[]> => {
        if (!fbUser) return [];
        const snap = await getDocs(collection(db, 'users', fbUser.uid, 'billing'));
        return snap.docs.map(d => d.data() as Invoice);
    };

    const getDevices = async (): Promise<Device[]> => {
        if (!fbUser) return [];
        const currentDevice: Device = {
            id: 'current',
            name: 'Current Browser',
            type: 'desktop',
            lastActiveAt: new Date().toISOString(),
            isCurrent: true
        };
        const snap = await getDocs(collection(db, 'users', fbUser.uid, 'devices'));
        const storedDevices = snap.docs.map(d => ({ ...d.data(), id: d.id } as Device));
        return [currentDevice, ...storedDevices];
    };
    
    const logoutDevice = async (deviceId: string) => {
        if (!fbUser) return;
        await deleteDoc(doc(db, 'users', fbUser.uid, 'devices', deviceId));
    };

    const logoutAllDevices = async () => {
        if (!fbUser) return;
        await updateUser({ tokenVersion: Date.now() });
        await logout();
    };

    const updateProfileAvatar = async (url: string) => {
        if (!currentProfile || !fbUser) return;
        const profileRef = doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id);
        await updateDoc(profileRef, { avatarUrl: url });
        setCurrentProfile({ ...currentProfile, avatarUrl: url });
    };



    const updateContentRequest = async (id: string, updates: Partial<ContentRequest>) => {
        const reqRef = doc(db, 'requests', id);
        await updateDoc(reqRef, { ...updates, updatedAt: new Date().toISOString() });
    };

    const submitContentRequest = async (title: string) => {
        if (!currentUser) throw new Error("Must be logged in");
        await addDoc(collection(db, 'requests'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentProfile?.name || 'User',
            contentTitle: title,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    };

    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setContentRequests([]);
            return;
        }

        const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentRequest));
            setContentRequests(reqs);
        });

        return () => unsubscribe();
    }, [currentUser?.role, currentUser?.uid]);

    const unlockContent = async (code: string): Promise<{ success: boolean; contentId?: string; message: string }> => {
        if (!fbUser || !currentProfile) return { success: false, message: 'Please sign in first.' };

        if (!settings.globalExclusiveCode) {
            return { success: false, message: 'No exclusive content available right now.' };
        }

        if (code !== settings.globalExclusiveCode) {
            return { success: false, message: 'Invalid Access Code.' };
        }

        if (currentProfile.unlockedContent?.includes('global_unlock')) {
            return { success: true, message: 'Exclusive content already unlocked!' };
        }

        const newUnlockedList = [...(currentProfile.unlockedContent || []), 'global_unlock'];
        await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id), {
            unlockedContent: newUnlockedList
        });

        setCurrentProfile({ ...currentProfile, unlockedContent: newUnlockedList });

        return { success: true, message: `Access Granted. Exclusive content unlocked!` };
    };

    const markNotificationAsRead = async (notificationId: string) => {
        if (!fbUser || !currentUser) return;
        const currentRead = currentUser.readNotifications || [];
        if (currentRead.includes(notificationId)) return;

        const newReadList = [...currentRead, notificationId];
        // Optimistic update
        setCurrentUser({ ...currentUser, readNotifications: newReadList });

        await updateUser({ readNotifications: newReadList });
    };

    // Compute notifications (filter out read ones)
    const processedNotifications = useMemo(() => {
        if (!currentUser) return notifications;
        return notifications.filter(n => !currentUser.readNotifications?.includes(n.id));
    }, [notifications, currentUser?.readNotifications]);

    // Standard Content: Strictly NO exclusive items for anyone (filtered at this layer)
    const standardContent = useMemo(() => {
        return content.filter(item => !item.isExclusive);
    }, [content]);

    // Exclusive Content: Strictly ONLY exclusive items
    const exclusiveContent = useMemo(() => {
        return content.filter(item => item.isExclusive);
    }, [content]);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        loginWithApple,
        loginAsGuest,
        logout,
        content: standardContent,
        rawContent: content,
        exclusiveContent,
        users,
        currentUser,
        currentProfile,
        userProfiles,
        settings,
        sections,
        plans,
        notifications: processedNotifications,
        addContent,
        updateContent,
        deleteContent,
        updateSettings,
        updateSections,
        toggleSectionVisibility,
        updateUser,
        toggleWatchlist,
        switchProfile,
        addProfile,
        updateProfile,
        deleteProfile,
        updatePlaybackProgress,
        updateUserEmail,
        triggerPasswordReset,
        updateSubscriptionPlan,
        addPaymentMethod,
        deletePaymentMethod,
        getBillingHistory,
        getDevices,
        logoutDevice,
        logoutAllDevices,
        updateProfileAvatar,
        unlockContent,
        markNotificationAsRead,
        isInstallable,
        isIOS,
        installPwa,
        updateContentRequest,
        submitContentRequest,
        contentRequests,
        pages,

        updateContentDuration: async (id: string, duration: string) => {
            if (!currentUser || currentUser.role !== 'admin') return;
            // Only update if it's a valid duration string
            if (duration && duration.length > 0) {
                await updateDoc(doc(db, 'content', id), { duration });
            }
        },

        addPage: async (page: Page) => {
            await setDoc(doc(db, 'pages', page.id), page);
        },
        updatePage: async (id: string, updates: Partial<Page>) => {
            await updateDoc(doc(db, 'pages', id), updates);
        },
        deletePage: async (id: string) => {
            await deleteDoc(doc(db, 'pages', id));
        },
        incrementViews: async (id: string) => {
            await updateDoc(doc(db, 'content', id), {
                views: increment(1)
            });
        },
        incrementLikes: async (id: string) => {
            await updateDoc(doc(db, 'content', id), {
                likes: increment(1)
            });
        }
    }), [
        isAuthenticated,
        isLoading,
        standardContent,
        content,
        exclusiveContent,
        pages,
        users,
        currentUser,
        currentProfile,
        userProfiles,
        settings,
        sections,
        plans,
        processedNotifications,
        isInstallable,
        isIOS,
        contentRequests,
        submitContentRequest,
        updateContentRequest,
        pages,
        db
    ]);

    // Safeguard: Force loading to end after 5 seconds if auth hangs
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn("Auth initialization timed out, forcing app load.");
                setIsLoading(false);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    // Minimum Loading Time Logic
    const [minLoadFinished, setMinLoadFinished] = useState(false);

    return (
        <StoreContext.Provider value={contextValue}>
            {(!minLoadFinished) ? (
                <Loader
                    dataReady={!isLoading}
                    onComplete={() => setMinLoadFinished(true)}
                />
            ) : (
                children
            )}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used within a StoreProvider');
    return context;
};