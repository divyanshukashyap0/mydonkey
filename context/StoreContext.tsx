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
    ContentRequest
} from '../types';
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
    serverTimestamp
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
    switchProfile: (profileId: string | null) => void;
    addProfile: (name: string, isKids: boolean, avatarUrl: string) => Promise<void>;
    deleteProfile: (profileId: string) => Promise<void>;
    updatePlaybackProgress: (movieId: string, progress: number, stoppedAt: number, duration: number) => Promise<void>;
    updateUserEmail: (newEmail: string) => Promise<void>;
    triggerPasswordReset: () => Promise<void>;
    updateSubscriptionPlan: (planId: string, paymentResponse?: any) => Promise<void>;
    addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
    deletePaymentMethod: (id: string) => Promise<void>;
    getBillingHistory: () => Promise<Invoice[]>;
    getDevices: () => Promise<Device[]>;
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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: "MY DONKEY",
    heroVideoQuality: 'hd1080',
    maintenanceMode: false,
    theme: 'default'
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [content, setContent] = useState<Content[]>([]);
    const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
    const [sections, setSections] = useState<Section[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [contentRequests, setContentRequests] = useState<ContentRequest[]>([]);

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

                    const tempUser: AppUser = {
                        uid: firebaseUser.uid,
                        email: userEmail,
                        plan: 'Free',
                        role: isGuest ? 'guest' : 'user',
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
                            plan: 'Free',
                            role: isGuest ? 'guest' : 'user',
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
                                : 'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
                            isKids: false,
                            myList: []
                        };
                        await setDoc(doc(db, 'users', firebaseUser.uid, 'profiles', profileId), defaultProfile);
                        setCurrentProfile(defaultProfile); // Set immediately for guests
                        setCurrentUser(newAppUser);
                    } else {
                        const userData = userSnap.data() as AppUser;
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
    useEffect(() => {
        const unsubContent = onSnapshot(collection(db, 'content'), (snap) => {
            setContent(snap.docs.map(d => ({ ...d.data(), id: d.id } as Content)));
        });

        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
            if (doc.exists()) setSettings(doc.data() as SiteSettings);
        });

        const unsubSections = onSnapshot(query(collection(db, 'sections'), orderBy('order')), (snap) => {
            setSections(snap.docs.map(d => ({ ...d.data(), id: d.id } as Section)));
        });

        const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
            setPlans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Plan)));
        });

        const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (snap) => {
            setNotifications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification)));
        });

        let unsubUsers = () => { };
        if (currentUser?.role === 'admin') {
            unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
                setUsers(snap.docs.map(d => d.data() as AppUser));
            });
        }

        return () => {
            unsubContent();
            unsubSettings();
            unsubSections();
            unsubPlans();
            unsubNotifs();
            unsubUsers();
        };
    }, [currentUser?.role]);

    // 3. User Specific Sync
    useEffect(() => {
        if (!fbUser) return;

        const unsubUserDoc = onSnapshot(doc(db, 'users', fbUser.uid), (doc) => {
            if (doc.exists()) setCurrentUser(doc.data() as AppUser);
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
        // window.location.reload(); // Removed to prevent full page refresh
    };

    const addContent = async (item: Content) => {
        await setDoc(doc(db, 'content', item.id), item);
    };

    const updateContent = async (id: string, updates: Partial<Content>) => {
        await updateDoc(doc(db, 'content', id), updates);
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

    const switchProfile = (profileId: string | null) => {
        if (!profileId) {
            setCurrentProfile(null);
            return;
        }
        const profile = userProfiles.find(p => p.id === profileId);
        if (profile) setCurrentProfile(profile);
    };

    const addProfile = async (name: string, isKids: boolean, avatarUrl: string) => {
        if (!fbUser) return;
        const id = `profile_${Date.now()}`;
        const newProfile: Profile = { id, name, isKids, avatarUrl, myList: [] };
        await setDoc(doc(db, 'users', fbUser.uid, 'profiles', id), newProfile);
    };

    const deleteProfile = async (profileId: string) => {
        if (!fbUser) return;
        await deleteDoc(doc(db, 'users', fbUser.uid, 'profiles', profileId));
        if (currentProfile?.id === profileId) setCurrentProfile(null);
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
        const storedDevices = snap.docs.map(d => d.data() as Device);
        return [currentDevice, ...storedDevices];
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
            const reqs = snapshot.docs.map(doc => ({ ...doc.data() } as ContentRequest));
            setContentRequests(reqs);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const unlockContent = async (code: string): Promise<{ success: boolean; contentId?: string; message: string }> => {
        if (!fbUser || !currentProfile) return { success: false, message: 'Please sign in first.' };

        // 1. Find content with this code
        // Note: In a real app with large DB, this should be a query. For now, client-side filter is okay or query.
        // Let's use the local content state for speed, then verify with server if needed.
        // Actually, for security, the code should ideally not be exposed in public 'content' if we didn't want users to inspect it. 
        // But assumed 'content' collection is readable.

        const targetContent = content.find(c => c.accessCode === code);

        if (!targetContent) {
            return { success: false, message: 'Invalid Access Code.' };
        }

        if (currentProfile.unlockedContent?.includes(targetContent.id)) {
            return { success: true, contentId: targetContent.id, message: 'Content already unlocked!' };
        }

        // 2. Unlock it
        const newUnlockedList = [...(currentProfile.unlockedContent || []), targetContent.id];
        await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id), {
            unlockedContent: newUnlockedList
        });

        // 3. Update local state immediately for responsiveness
        setCurrentProfile({ ...currentProfile, unlockedContent: newUnlockedList });

        return { success: true, contentId: targetContent.id, message: `Unlocked: ${targetContent.title}` };
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

    // Compute notifications with read status
    const processedNotifications = useMemo(() => {
        if (!currentUser) return notifications;
        return notifications.map(n => ({
            ...n,
            read: currentUser.readNotifications?.includes(n.id) || false
        }));
    }, [notifications, currentUser?.readNotifications]);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        loginWithApple,
        loginAsGuest,
        logout,
        content,
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
        deleteProfile,
        updatePlaybackProgress,
        updateUserEmail,
        triggerPasswordReset,
        updateSubscriptionPlan,
        addPaymentMethod,
        deletePaymentMethod,
        getBillingHistory,
        getDevices,
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

        updateContentDuration: async (id: string, duration: string) => {
            if (!currentUser || currentUser.role !== 'admin') return;
            // Only update if it's a valid duration string
            if (duration && duration.length > 0) {
                await updateDoc(doc(db, 'content', id), { duration });
            }
        }
    }), [
        isAuthenticated,
        isLoading,
        content,
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
        updateContentRequest
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

    return (
        <StoreContext.Provider value={contextValue}>
            {isLoading ? (
                <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-brand-red/30 border-t-brand-red rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 text-sm animate-pulse">Initializing...</p>
                </div>
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