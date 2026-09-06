import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useRef, useCallback } from 'react';
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
    ContinueWatchingItem,
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
    limit,
    serverTimestamp,
    getDocsFromCache,
    increment,
    writeBatch,
    disableNetwork,
} from 'firebase/firestore';
import { idbGet, idbSet } from '../utils/idbCache';
import { FALLBACK_CATALOG, FALLBACK_SECTIONS, fetchDynamicFallbackContent, buildDynamicSections } from '../services/fallbackCatalog';
import { isIndianOrMarvelContent } from '../services/recommendationService';

interface StoreContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    isQuotaExceeded: boolean;
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
    addToWatchHistory: (contentOrId: Content | string) => Promise<void>;
    updateFavoriteGenres: (genres: string[]) => Promise<void>;
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
    publishCatalog: () => Promise<void>;
    fetchContentById: (id: string) => Promise<Content | null>;
    likedContent: string[];
    toggleLike: (contentId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: "MY DONKEY",
    siteUrl: "https://www.mydonkey.in",
    heroVideoQuality: 'hd1080',
    heroContentIds: [],
    maintenanceMode: false,
    theme: 'default',
    websiteFont: 'Inter',
    rankFont: 'Anton',
    heroFont: 'Inter',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    linkedinUrl: '',
    embedProxyBaseUrl: 'https://proxy.garageband.rocks',
    embedMovieType: 'movie',
    embedTvType: 'tv',
    announcementBanner: '',
    guestAccessEnabled: true
};

export const PERMANENT_ADMINS = ['divyanshukashyap2430955@gmail.com', 'divyanshu00884466@gmail.com'];

/**
 * Strict 5-Second Timeout Helper:
 * Ensures no Firebase operation hangs indefinitely (e.g. during exponential backoff after quota exhaustion).
 * If Firebase does not respond within 5000ms, the promise rejects and the fallback state takes over.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
    let timer: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Firebase operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timer);
    });
}

/**
 * Ensures clean section configuration:
 * 1. Purges any "Marvel Series & Sagas", "Marvel Saga", or redundant Marvel sections.
 * 2. Strictly guarantees only ONE canonical "Marvel Cinematic Universe" rail exists.
 */
export function sanitizeSections(rawSections: Section[]): Section[] {
    if (!rawSections || !Array.isArray(rawSections)) return [];

    // Filter out any "marvel series", "marvel saga", "marvel series & sagas"
    const withoutSagas = rawSections.filter(s => {
        const title = (s.title || '').toLowerCase();
        if (title.includes('marvel') && (title.includes('saga') || title.includes('series'))) {
            return false;
        }
        return true;
    });

    // Deduplicate Marvel sections - strictly keep only ONE canonical "Marvel Cinematic Universe"
    let seenMarvel = false;
    const result: Section[] = [];
    for (const sec of withoutSagas) {
        const titleLower = (sec.title || '').toLowerCase();
        const tagLower = (sec.tagFilter || '').toLowerCase();
        const isMarvel = titleLower.includes('marvel') || tagLower === 'marvel';

        if (isMarvel) {
            if (!seenMarvel) {
                seenMarvel = true;
                result.push({
                    ...sec,
                    title: 'Marvel Cinematic Universe',
                    tagFilter: 'Marvel',
                    showRanking: true
                });
            }
        } else if (sec.id === 'sec_indian_webseries' || (titleLower.includes('web series') && sec.tagFilter === 'Indian')) {
            result.push({
                ...sec,
                tagFilter: 'Web Series'
            });
        } else {
            result.push(sec);
        }
    }
    return result;
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const firebaseDataReceivedRef = useRef(false);

    const [content, setContent] = useState<Content[]>(FALLBACK_CATALOG);
    // Load cached settings/plans if available
    const [settings, setSettings] = useState<SiteSettings>(() => {
        const cached = localStorage.getItem('globalSettings');
        return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
    });

    const [sections, setSections] = useState<Section[]>(() => sanitizeSections(FALLBACK_SECTIONS));
    const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => {
        try {
            return sessionStorage.getItem('firebase_quota_exceeded') === 'true';
        } catch {
            return false;
        }
    });
    const [users, setUsers] = useState<AppUser[]>([]);

    // Load cached plans if available
    const [plans, setPlans] = useState<Plan[]>(() => {
        const cached = localStorage.getItem('cachedPlans');
        return cached ? JSON.parse(cached) : [];
    });
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [contentRequests, setContentRequests] = useState<ContentRequest[]>([]);
    const [pages, setPages] = useState<Page[]>([]);
    const [likedContent, setLikedContent] = useState<string[]>(() => {
        try {
            const cached = localStorage.getItem('my_donkey_liked_content');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    // Track versions in memory to prevent infinite loops if LocalStorage fails
    const localContentVersionRef = React.useRef(parseInt(localStorage.getItem('contentVersion') || '0'));
    const localSectionsVersionRef = React.useRef(parseInt(localStorage.getItem('sectionsVersion') || '0'));

    // Helper to heal broken/dummy poster and backdrop URLs and synchronize with curated catalog
    const healAndMergeCatalog = useCallback((existing: Content[]): Content[] => {
        const curatedMap = new Map<string, Content>();
        FALLBACK_CATALOG.forEach(item => curatedMap.set(item.id, item));

        const brokenPatterns = ['_poster.jpg', '_backdrop.jpg', 'geCRueV3ElhRTr0xtJu3J8WODRf', 'jYW3jHl8D1wS4w7w9H4t9w8l'];

        const healed = existing.map(item => {
            const curated = curatedMap.get(item.id);
            if (curated) {
                return {
                    ...item,
                    ...curated,
                    isPublished: true,
                    allowPlayback: true,
                };
            }
            const posterBroken = !item.poster_path || brokenPatterns.some(p => item.poster_path?.includes(p));
            const backdropBroken = !item.backdrop_path || brokenPatterns.some(p => item.backdrop_path?.includes(p));
            if (posterBroken && item.backdrop_path && !backdropBroken) {
                return { ...item, poster_path: item.backdrop_path };
            }
            return item;
        });

        const existingIds = new Set(healed.map(h => h.id));
        FALLBACK_CATALOG.forEach(item => {
            if (!existingIds.has(item.id)) {
                existingIds.add(item.id);
                healed.push(item);
            }
        });

        return healed;
    }, []);

    const handleQuotaExceeded = useCallback(() => {
        setIsQuotaExceeded(true);
        setIsLoading(false);
        try {
            sessionStorage.setItem('firebase_quota_exceeded', 'true');
        } catch (e) { }
        console.warn("[Quota Fallback] Database quota exceeded or timed out. Website seamlessly serving curated Indian, Marvel, and Anime content.");

        // Immediately shut down Firestore network to stop backoff loops, quota errors, and backend overloading
        try {
            disableNetwork(db).catch(() => {});
        } catch (e) { }

        setContent(prev => {
            const healed = healAndMergeCatalog(prev && prev.length > 0 ? prev : FALLBACK_CATALOG);
            idbSet('cachedContent', healed).catch(() => {});
            return healed;
        });

        setSections(prev => {
            if (!prev || prev.length === 0) return sanitizeSections(FALLBACK_SECTIONS);
            return sanitizeSections(prev);
        });

        fetchDynamicFallbackContent().then(dynamicItems => {
            if (dynamicItems && dynamicItems.length > 0) {
                const healed = healAndMergeCatalog(dynamicItems);
                setContent(healed);
                idbSet('cachedContent', healed).catch(() => {});
                // Also update sections to match the dynamically fetched content
                const dynSections = sanitizeSections(buildDynamicSections(healed));
                setSections(dynSections);
            }
        }).catch(() => {});
    }, [healAndMergeCatalog]);

    const handleQuotaExceededRef = useRef(handleQuotaExceeded);
    handleQuotaExceededRef.current = handleQuotaExceeded;

    // If quota was already exceeded this session, disable network upfront to stop background Firestore retry spam
    useEffect(() => {
        if (sessionStorage.getItem('firebase_quota_exceeded') === 'true') {
            try {
                disableNetwork(db).catch(() => {});
            } catch (e) { }
        }
    }, []);

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
                        const guestEmail = `guest-${guestUid.substring(0, 6)}@guest.local`;

                        // Guest logic flows into main logic below
                    }

                    // OPTIMISTIC UPDATE: Prevent "Login Page" flash by setting auth state immediately
                    // This ensures that even if DB fetch is slow/times out, we show ProfileSelection (loading) instead of Login

                    const isGuest = firebaseUser.isAnonymous;
                    const userEmail = isGuest ? `guest-${firebaseUser.uid.substring(0, 6)}@guest.local` : (firebaseUser.email || '');

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
                    const userSnap = await withTimeout(getDoc(userRef), 5000);
                    if (userSnap.exists()) {
                        firebaseDataReceivedRef.current = true;
                    }

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
                        await withTimeout(setDoc(userRef, newAppUser), 5000).catch(() => {});

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
                        await withTimeout(setDoc(doc(db, 'users', firebaseUser.uid, 'profiles', profileId), defaultProfile), 5000).catch(() => {});
                        setCurrentProfile(defaultProfile); // Set immediately for guests
                        setCurrentUser(newAppUser);
                    } else {
                        // Backfill name if missing for existing users
                        const userData = userSnap.data() as AppUser;

                        // Force Admin Role for Permanent Admins
                        if (isPermanentAdmin && userData.role !== 'admin') {
                            setDoc(userRef, { role: 'admin' }, { merge: true }).catch(() => {});
                            userData.role = 'admin';
                        }

                        if (!userData.name) {
                            setDoc(userRef, {
                                name: firebaseUser.displayName || userEmail.split('@')[0]
                            }, { merge: true }).catch(() => {});
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
                            try {
                                const profilesSnap = await withTimeout(getDocs(collection(db, 'users', firebaseUser.uid, 'profiles')), 5000);
                                if (!profilesSnap.empty) {
                                    setCurrentProfile(profilesSnap.docs[0].data() as Profile);
                                }
                            } catch { }
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
                console.warn("[Auth] Firebase took >5s or failed. Assuming database quota exceeded and running fallback state:", error);

                // CRITICAL FIX: If we have a firebaseUser but DB failed, 
                // we should STILL treat them as authenticated to avoid login loops.
                // We'll just have incomplete data until a retry or reload happens.
                if (firebaseUser) {
                    // Create a temporary fallback user object so the app doesn't crash
                    const fallbackUser: AppUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || (firebaseUser.email || '').split('@')[0] || 'User',
                        plan: 'Free',
                        role: PERMANENT_ADMINS.includes(firebaseUser.email || '') ? 'admin' : 'user',
                        status: 'active',
                        lastLoginAt: new Date().toISOString()
                    };
                    setCurrentUser(fallbackUser);
                    const fallbackProfile: Profile = {
                        id: 'main',
                        name: firebaseUser.displayName || 'User',
                        avatarUrl: '/Mydonkey%20user.jpg',
                        isKids: false,
                        myList: []
                    };
                    setCurrentProfile(fallbackProfile);
                    setUserProfiles([fallbackProfile]);
                    setIsAuthenticated(true);
                    handleQuotaExceededRef.current();
                } else {
                    setIsAuthenticated(false);
                }
            } finally {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // In-memory session tracking for view increments (zero writes on repeat views)
    const viewedContentIds = useRef<Set<string>>(new Set());

    // Instant Boot from IndexedDB Cache (0 network reads)
    useEffect(() => {
        let isMounted = true;
        const loadCache = async () => {
            try {
                if (sessionStorage.getItem('firebase_quota_exceeded') === 'true') {
                    handleQuotaExceededRef.current();
                }

                const [cachedContent, cachedVer, cachedSections, cachedSecVer] = await Promise.all([
                    idbGet<Content[]>('cachedContent'),
                    idbGet<number>('contentVersion'),
                    idbGet<Section[]>('cachedSections'),
                    idbGet<number>('sectionsVersion'),
                ]);

                if (isMounted) {
                    if (cachedContent && cachedContent.length > 0) {
                        const healed = healAndMergeCatalog(cachedContent);
                        setContent(healed);
                        if (cachedVer) localContentVersionRef.current = cachedVer;
                        idbSet('cachedContent', healed).catch(() => {});
                    } else {
                        setContent(FALLBACK_CATALOG);
                        idbSet('cachedContent', FALLBACK_CATALOG).catch(() => {});
                    }
                    if (cachedSections && cachedSections.length > 0) {
                        const cleaned = sanitizeSections(cachedSections);
                        setSections(cleaned);
                        if (cleaned.length !== cachedSections.length) {
                            idbSet('cachedSections', cleaned).catch(() => {});
                        }
                        if (cachedSecVer) localSectionsVersionRef.current = cachedSecVer;
                    } else {
                        setSections(sanitizeSections(FALLBACK_SECTIONS));
                    }
                }
            } catch (err) {
                console.warn("IndexedDB boot error:", err);
                if (isMounted) {
                    setContent(FALLBACK_CATALOG);
                    setSections(sanitizeSections(FALLBACK_SECTIONS));
                }
            }
        };
        loadCache();
        return () => { isMounted = false; };
    }, []);

    // 2. Data Sync Listeners - Decoupled from user role (Runs ONCE on mount)
    useEffect(() => {
        // A. Settings Listener (Single Doc Read - Signal for updates)
        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), async (docSnap) => {
            if (docSnap.exists()) {
                firebaseDataReceivedRef.current = true;
                const serverSettings = docSnap.data() as SiteSettings;
                setSettings(serverSettings);
                try {
                    localStorage.setItem('globalSettings', JSON.stringify(serverSettings));
                } catch (e) { console.warn("LS Full (Settings)", e); }

                // B. Content Sync Logic
                const currentLocalContentVersion = localContentVersionRef.current;
                const serverContentVersion = Number(serverSettings.contentVersion || 0);

                // Check if fresh fetch is truly necessary
                const needsContentFetch = serverContentVersion === 0 || serverContentVersion !== currentLocalContentVersion;

                if (needsContentFetch) {
                    let freshContent: Content[] = [];
                    try {
                        // 1. Try single compact catalog read (1 read vs 734 reads!)
                        const catalogSnap = await withTimeout(getDoc(doc(db, 'catalogs', 'global')), 5000);
                        if (catalogSnap.exists() && catalogSnap.data()?.items?.length > 0) {
                            freshContent = catalogSnap.data().items;
                            firebaseDataReceivedRef.current = true;
                        } else {
                            // 2. Fallback: only if catalog is not built yet
                            const contentSnap = await withTimeout(getDocs(collection(db, 'content')), 5000);
                            freshContent = contentSnap.docs.map(d => ({ ...d.data(), id: d.id } as Content));
                            if (freshContent.length > 0) firebaseDataReceivedRef.current = true;
                        }
                    } catch (err) {
                        handleQuotaExceededRef.current();
                        try {
                            const contentSnap = await getDocsFromCache(collection(db, 'content'));
                            freshContent = contentSnap.docs.map(d => ({ ...d.data(), id: d.id } as Content));
                        } catch (cacheErr) {
                            // Keep existing state
                        }
                    }

                    if (freshContent.length > 0) {
                        setContent(freshContent);
                        localContentVersionRef.current = serverContentVersion;
                        idbSet('cachedContent', freshContent).catch(() => {});
                        idbSet('contentVersion', serverContentVersion).catch(() => {});
                    }
                }

                // C. Sections Sync Logic
                const currentLocalSectionsVersion = localSectionsVersionRef.current;
                const serverSectionsVersion = Number(serverSettings.sectionsVersion || 0);
                const needsSectionsFetch = serverSectionsVersion === 0 || serverSectionsVersion !== currentLocalSectionsVersion;

                if (needsSectionsFetch) {
                    let freshSections: Section[] = [];
                    try {
                        const sectionsSnap = await withTimeout(getDocs(query(collection(db, 'sections'), orderBy('order'))), 5000);
                        freshSections = sectionsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Section));
                        if (freshSections.length > 0) firebaseDataReceivedRef.current = true;
                    } catch (err) {
                        handleQuotaExceededRef.current();
                        try {
                            const sectionsSnap = await getDocsFromCache(query(collection(db, 'sections'), orderBy('order')));
                            freshSections = sectionsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Section));
                        } catch (cacheErr) { }
                    }

                    if (freshSections.length > 0) {
                        const cleaned = sanitizeSections(freshSections);
                        setSections(cleaned);
                        localSectionsVersionRef.current = serverSectionsVersion;
                        idbSet('cachedSections', cleaned).catch(() => {});
                        idbSet('sectionsVersion', serverSectionsVersion).catch(() => {});
                    }
                }
            }
        }, (error) => {
            handleQuotaExceededRef.current();

            // FAILSAFE: Try to load from IndexedDB / Cache
            idbGet<Content[]>('cachedContent').then(cached => {
                if (cached && cached.length > 0) {
                    const healed = healAndMergeCatalog(cached);
                    setContent(healed);
                } else {
                    getDocsFromCache(collection(db, 'content')).then(snap => {
                        if (!snap.empty) {
                            const healed = healAndMergeCatalog(snap.docs.map(d => ({ ...d.data(), id: d.id } as Content)));
                            setContent(healed);
                        } else {
                            setContent(FALLBACK_CATALOG);
                        }
                    }).catch(() => { setContent(FALLBACK_CATALOG); });
                }
            }).catch(() => { setContent(FALLBACK_CATALOG); });

            idbGet<Section[]>('cachedSections').then(cached => {
                if (cached && cached.length > 0) setSections(sanitizeSections(cached));
                else {
                    getDocsFromCache(query(collection(db, 'sections'), orderBy('order'))).then(snap => {
                        if (!snap.empty) setSections(sanitizeSections(snap.docs.map(d => ({ ...d.data(), id: d.id } as Section))));
                        else setSections(sanitizeSections(FALLBACK_SECTIONS));
                    }).catch(() => { setSections(sanitizeSections(FALLBACK_SECTIONS)); });
                }
            }).catch(() => { setSections(sanitizeSections(FALLBACK_SECTIONS)); });
        });

        // Plans: Fetch once with getDocs and cache (capped at 5 seconds)
        withTimeout(getDocs(collection(db, 'plans')), 5000).then(snap => {
            if (!snap.empty) firebaseDataReceivedRef.current = true;
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Plan));
            setPlans(data);
            try { localStorage.setItem('cachedPlans', JSON.stringify(data)); } catch (e) { }
        }).catch((err) => {
            handleQuotaExceededRef.current();
            getDocsFromCache(collection(db, 'plans')).then(snap => {
                if (!snap.empty) setPlans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Plan)));
            }).catch(() => {});
        });

        // Pages: Fetch once with getDocs (capped at 5 seconds)
        withTimeout(getDocs(collection(db, 'pages')), 5000).then(snap => {
            if (!snap.empty) firebaseDataReceivedRef.current = true;
            setPages(snap.docs.map(d => ({ ...d.data(), id: d.id } as Page)));
        }).catch((err) => {
            handleQuotaExceededRef.current();
            getDocsFromCache(collection(db, 'pages')).then(snap => {
                if (!snap.empty) setPages(snap.docs.map(d => ({ ...d.data(), id: d.id } as Page)));
            }).catch(() => {});
        });

        return () => {
            unsubSettings();
        };
    }, []);

    // Dedicated Admin Users Listener: Only active when an admin user is logged in
    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setUsers([]);
            return;
        }

        const qUsers = query(collection(db, 'users'), limit(50));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser)));
        }, (error) => {
            console.warn("Admin users fetch:", error);
        });

        return () => unsubUsers();
    }, [currentUser?.role]);

    // 3. User Specific Sync
    useEffect(() => {
        if (!fbUser) return;

        const unsubUserDoc = onSnapshot(doc(db, 'users', fbUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as AppUser;
                if (data.role === 'admin' || !currentUser) setCurrentUser(data);
            }
        }, (error) => {
            if (error?.code === 'resource-exhausted' || error?.message?.toLowerCase().includes('quota')) {
                handleQuotaExceededRef.current();
            }
        });

        const unsubProfiles = onSnapshot(collection(db, 'users', fbUser.uid, 'profiles'), (snap) => {
            const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() } as Profile));
            setUserProfiles(profiles);

            if (currentProfile) {
                const updated = profiles.find(p => p.id === currentProfile.id);
                if (updated) {
                    setCurrentProfile(updated);
                } else if (profiles.length > 0) {
                    setCurrentProfile(profiles[0]);
                    localStorage.setItem('selectedProfileId', profiles[0].id);
                } else {
                    setCurrentProfile(null);
                    localStorage.removeItem('selectedProfileId');
                }
            } else if (profiles.length > 0) {
                const savedId = localStorage.getItem('selectedProfileId');
                const matched = savedId ? profiles.find(p => p.id === savedId) : null;
                const active = matched || profiles[0];
                setCurrentProfile(active);
                localStorage.setItem('selectedProfileId', active.id);
            }
        }, (error) => {
            if (error?.code === 'resource-exhausted' || error?.message?.toLowerCase().includes('quota')) {
                handleQuotaExceededRef.current();
            }
            if (!currentProfile) {
                const fallbackProfile: Profile = {
                    id: 'main',
                    name: fbUser.displayName || 'User',
                    avatarUrl: '/Mydonkey%20user.jpg',
                    isKids: false,
                    myList: []
                };
                setCurrentProfile(fallbackProfile);
                setUserProfiles([fallbackProfile]);
            }
        });

        return () => {
            unsubUserDoc();
            unsubProfiles();
        };
    }, [fbUser, currentProfile?.id]);

    // 4. Activity Tracker (Gentle Session Heartbeat, max once per 30 mins)
    const lastActivityRef = React.useRef<number>(0);

    useEffect(() => {
        if (!fbUser) return;

        const updateActivity = async () => {
            const now = Date.now();
            if (now - lastActivityRef.current > 30 * 60 * 1000) {
                lastActivityRef.current = now;
                try {
                    await updateDoc(doc(db, 'users', fbUser.uid), {
                        lastActiveAt: new Date().toISOString()
                    });
                } catch {
                    // Silently ignore background activity errors
                }
            }
        };

        // Gentle check 15s after initial login, then every 30 minutes
        const timer = setTimeout(updateActivity, 15000);
        const interval = setInterval(updateActivity, 30 * 60 * 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [fbUser?.uid]);

    // Methods
    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
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

    const publishCatalog = async () => {
        try {
            const contentSnap = await getDocs(collection(db, 'content'));
            const allContent = contentSnap.docs.map(d => {
                const data = d.data() as Content;
                // Compact summary: strip bulky nested seasons/episodes/cast to keep document small (< 100KB, well under 1MB Firestore limit)
                const { seasons, episodes, cast, ...summary } = data as any;
                return { ...summary, id: d.id } as Content;
            });
            
            const newVersion = Date.now();
            const batch = writeBatch(db);

            // 1. Write compact catalog
            batch.set(doc(db, 'catalogs', 'global'), {
                items: allContent,
                updatedAt: new Date().toISOString(),
                count: allContent.length
            });

            // 2. Atomically bump contentVersion in settings
            batch.set(doc(db, 'settings', 'global'), {
                contentVersion: newVersion
            }, { merge: true });

            // Commit atomically together
            await batch.commit();

            // Update local memory and IndexedDB cache
            localContentVersionRef.current = newVersion;
            setSettings(prev => ({ ...prev, contentVersion: newVersion }));
            await idbSet('cachedContent', allContent);
            await idbSet('contentVersion', newVersion);
        } catch (error) {
            console.error("[Catalog] Publication failed:", error);
        }
    };

    const fetchContentById = async (id: string): Promise<Content | null> => {
        if (!id) return null;
        const existing = content.find(c => c.id === id);
        // If already in memory with full details/seasons (if applicable), return it
        if (existing && (!existing.type || existing.type === 'movie' || (existing.seasons && existing.seasons.length > 0))) {
            return existing;
        }
        try {
            const docSnap = await withTimeout(getDoc(doc(db, 'content', id)), 5000);
            if (docSnap.exists()) {
                const fullItem = { ...docSnap.data(), id: docSnap.id } as Content;
                setContent(prev => {
                    const idx = prev.findIndex(c => c.id === id);
                    if (idx > -1) {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], ...fullItem };
                        return updated;
                    }
                    return [fullItem, ...prev];
                });
                return fullItem;
            }
        } catch (e) {
            console.warn("[Content Fetch] Firebase took >5s or failed for doc:", id, e);
            handleQuotaExceeded();
        }
        return existing || null;
    };

    const addContent = async (item: Content) => {
        await setDoc(doc(db, 'content', item.id), item);
        await publishCatalog();
    };

    const updateContent = async (id: string, updates: Partial<Content>) => {
        await updateDoc(doc(db, 'content', id), updates);
        await publishCatalog();
    };

    const deleteContent = async (id: string) => {
        await deleteDoc(doc(db, 'content', id));
        setContent(prev => prev.filter(c => c.id !== id));
        await publishCatalog();
    };

    const updateSettings = async (updates: Partial<SiteSettings>) => {
        await setDoc(doc(db, 'settings', 'global'), updates, { merge: true });
    };

    const updateSections = async (newSections: Section[]) => {
        const cleaned = sanitizeSections(newSections);
        for (const s of cleaned) {
            await setDoc(doc(db, 'sections', s.id), s);
        }
        setSections(cleaned);
        idbSet('cachedSections', cleaned).catch(() => {});
    };

    const toggleSectionVisibility = async (id: string) => {
        const section = sections.find(s => s.id === id);
        if (section) {
            await updateDoc(doc(db, 'sections', id), { enabled: !section.enabled });
        }
    };

    const updateUser = async (updates: Partial<AppUser>) => {
        setCurrentUser(prev => prev ? ({ ...prev, ...updates }) : null);
        if (fbUser && !isQuotaExceeded) {
            try {
                await updateDoc(doc(db, 'users', fbUser.uid), updates);
            } catch (err) {
                console.warn("updateUser Firestore skipped/failed:", err);
            }
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
        setUserProfiles(prev => [...prev, newProfile]);
        return newProfile;
    };

    const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
        if (!fbUser || !profileId) return;
        await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', profileId), updates);
        setUserProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));

        // Update local state if it's the current profile
        if (currentProfile?.id === profileId) {
            setCurrentProfile(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const deleteProfile = async (profileId: string) => {
        if (!fbUser || !profileId) return;

        if (userProfiles.length <= 1) {
            alert("Cannot delete your only profile. You must keep at least one profile.");
            return;
        }

        try {
            await deleteDoc(doc(db, 'users', fbUser.uid, 'profiles', profileId));
        } catch (err) {
            console.error("Failed to delete profile document from Firestore:", err);
            throw err;
        }

        const remaining = userProfiles.filter(p => p.id !== profileId);
        setUserProfiles(remaining);

        if (currentProfile?.id === profileId) {
            const nextProfile = remaining[0] || null;
            setCurrentProfile(nextProfile);
            if (nextProfile) {
                localStorage.setItem('selectedProfileId', nextProfile.id);
            } else {
                localStorage.removeItem('selectedProfileId');
            }
        }
    };

    const toggleWatchlist = async (contentId: string) => {
        if (!fbUser || !currentProfile) return;
        const isAdded = currentProfile.myList.includes(contentId);
        const newList = isAdded
            ? currentProfile.myList.filter(id => id !== contentId)
            : [...currentProfile.myList, contentId];

        setCurrentProfile(prev => prev ? { ...prev, myList: newList } : null);
        if (!isQuotaExceeded) {
            try {
                await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id), { myList: newList });
            } catch (err) { }
        }
    };

    const toggleLike = async (contentId: string) => {
        if (!contentId) return;
        const isCurrentlyLiked = likedContent.includes(contentId);
        const updated = isCurrentlyLiked
            ? likedContent.filter(id => id !== contentId)
            : [...likedContent, contentId];

        setLikedContent(updated);
        try {
            localStorage.setItem('my_donkey_liked_content', JSON.stringify(updated));
        } catch (_) {}

        if (!isCurrentlyLiked) {
            try {
                await setDoc(doc(db, 'content', contentId), {
                    likes: increment(1)
                }, { merge: true });
            } catch (_) {}
        }
    };

    const updatePlaybackProgress = async (movieId: string, progress: number, stoppedAt: number, duration: number) => {
        // 1. Immediately save to local storage (survives crashes, zero cost)
        try {
            const raw = localStorage.getItem('my_donkey_watch_history');
            const list = raw ? JSON.parse(raw) : [];
            const filtered = list.filter((i: any) => i.movieId !== movieId);
            filtered.unshift({
                movieId,
                progress,
                stoppedAt,
                duration,
                lastWatchedAt: new Date().toISOString()
            });
            localStorage.setItem('my_donkey_watch_history', JSON.stringify(filtered.slice(0, 30)));
        } catch (_) {}

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

    const addToWatchHistory = async (contentOrId: Content | string) => {
        const movieId = typeof contentOrId === 'string' ? contentOrId : contentOrId.id;
        const now = new Date().toISOString();

        // 1. Synchronous localStorage write to survive immediate page redirect
        try {
            const raw = localStorage.getItem('my_donkey_watch_history');
            const list = raw ? JSON.parse(raw) : [];
            const filtered = list.filter((i: any) => i.movieId !== movieId);
            filtered.unshift({
                movieId,
                progress: 15,
                stoppedAt: 60,
                duration: 7200,
                lastWatchedAt: now
            });
            localStorage.setItem('my_donkey_watch_history', JSON.stringify(filtered.slice(0, 30)));
        } catch (e) {
            console.warn("Local watch history update failed:", e);
        }

        // 2. Update currentUser continueWatching in Firestore
        if (currentUser) {
            const history = currentUser.continueWatching || [];
            const existingIdx = history.findIndex(h => h.movieId === movieId);
            const newEntry: ContinueWatchingItem = {
                movieId,
                progress: 15,
                stoppedAt: 60,
                duration: 7200,
                lastWatchedAt: now
            };
            let updatedHistory = [...history];
            if (existingIdx > -1) updatedHistory[existingIdx] = newEntry;
            else updatedHistory.unshift(newEntry);
            updatedHistory = updatedHistory.slice(0, 30);

            setCurrentUser(prev => prev ? { ...prev, continueWatching: updatedHistory } : null);

            if (fbUser && !isQuotaExceeded) {
                try {
                    await updateDoc(doc(db, 'users', fbUser.uid), { continueWatching: updatedHistory });
                } catch (err) { }
            }
        }
    };

    const updateFavoriteGenres = async (genres: string[]) => {
        const uniqueGenres = Array.from(new Set(genres.map(g => g.trim()).filter(Boolean)));

        // 1. Immediate localStorage persist
        try {
            localStorage.setItem('my_donkey_favorite_genres', JSON.stringify(uniqueGenres));
        } catch (e) {
            console.warn("Local favorite genres update failed:", e);
        }

        // 2. Update Current Profile if present
        if (currentProfile) {
            const updatedProfile = { ...currentProfile, favoriteGenres: uniqueGenres };
            setCurrentProfile(updatedProfile);
            setUserProfiles(prev => prev.map(p => p.id === currentProfile.id ? updatedProfile : p));

            if (fbUser) {
                try {
                    await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id), {
                        favoriteGenres: uniqueGenres
                    });
                } catch (err) {
                    console.error("Failed to update profile favorite genres in Firestore:", err);
                }
            }
        }

        // 3. Update User account level
        if (currentUser) {
            setCurrentUser(prev => prev ? { ...prev, favoriteGenres: uniqueGenres } : null);
            if (fbUser) {
                try {
                    await updateDoc(doc(db, 'users', fbUser.uid), {
                        favoriteGenres: uniqueGenres
                    });
                } catch (err) {
                    console.error("Failed to update user favorite genres in Firestore:", err);
                }
            }
        }
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

        const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(30));
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
        isQuotaExceeded,
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
        notifications: [] as Notification[],
        addContent,
        updateContent,
        deleteContent,
        updateSettings,
        updateSections,
        toggleSectionVisibility,
        updateUser,
        toggleWatchlist,
        likedContent,
        toggleLike,
        switchProfile,
        addProfile,
        updateProfile,
        deleteProfile,
        updatePlaybackProgress,
        addToWatchHistory,
        updateFavoriteGenres,
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
        markNotificationAsRead: async () => {},
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
            try {
                if (!id || viewedContentIds.current.has(id)) return;
                viewedContentIds.current.add(id);
                await setDoc(doc(db, 'content', id), {
                    views: increment(1)
                }, { merge: true });
            } catch {
                // Silently ignore
            }
        },
        incrementLikes: async (id: string) => {
            try {
                if (!id) return;
                await setDoc(doc(db, 'content', id), {
                    likes: increment(1)
                }, { merge: true });
            } catch {
                // Silently ignore
            }
        },
        publishCatalog,
        fetchContentById
    }), [
        isAuthenticated,
        isLoading,
        isQuotaExceeded,
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
        isInstallable,
        isIOS,
        contentRequests,
        submitContentRequest,
        updateContentRequest,
        pages,
        db,
        publishCatalog,
        fetchContentById,
        likedContent
    ]);

    // Master 5-Second Strict Deadline for Firebase:
    // Website takes at most 5 seconds to get data from Firebase.
    // If it fails or times out, the system assumes database quota is exceeded and runs on fallback state seamlessly without user knowing.
    useEffect(() => {
        const quotaTimeoutTimer = setTimeout(() => {
            if (!firebaseDataReceivedRef.current) {
                console.warn("[Quota Fallback] Firebase took > 5s to respond. Assuming database quota is exceeded. Running on fallback state seamlessly without user knowing.");
                handleQuotaExceededRef.current();
            }
            setIsLoading(false);
        }, 5000);
        return () => clearTimeout(quotaTimeoutTimer);
    }, []);

    // Minimum Loading Time Logic
    const [minLoadFinished, setMinLoadFinished] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadFinished(true);
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

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