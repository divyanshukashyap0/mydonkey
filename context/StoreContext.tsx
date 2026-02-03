import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
    Device
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
    sendPasswordResetEmail,
    updateEmail,
    deleteUser
} from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';

interface StoreContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithApple: () => Promise<void>;
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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: "MY DONKEY",
    heroVideoQuality: 'hd1080',
    maintenanceMode: false,
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

    // 1. Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setFbUser(firebaseUser);
            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    const newAppUser: AppUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        plan: 'Free',
                        role: 'user',
                        status: 'active',
                        lastLoginAt: new Date().toISOString()
                    };
                    await setDoc(userRef, newAppUser);
                    setCurrentUser(newAppUser);

                    // Create default profile
                    const profileId = 'main';
                    const defaultProfile: Profile = {
                        id: profileId,
                        name: firebaseUser.displayName || 'Me',
                        avatarUrl: 'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
                        isKids: false,
                        myList: []
                    };
                    await setDoc(doc(db, 'users', firebaseUser.uid, 'profiles', profileId), defaultProfile);
                } else {
                    const userData = userSnap.data() as AppUser;
                    // Check token version to force logout if needed
                    const localTokenVersion = localStorage.getItem('tokenVersion');
                    if (userData.tokenVersion && localTokenVersion && parseInt(localTokenVersion) < userData.tokenVersion) {
                        await signOut(auth);
                        window.location.reload();
                        return;
                    }
                    if (userData.tokenVersion) {
                        localStorage.setItem('tokenVersion', userData.tokenVersion.toString());
                    }

                    setCurrentUser(userData);
                }
                setIsAuthenticated(true);
            } else {
                setCurrentUser(null);
                setCurrentProfile(null);
                setUserProfiles([]);
                setIsAuthenticated(false);
            }
            setIsLoading(false);
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
        await signInWithPopup(auth, provider);
    };

    const loginWithApple = async () => {
        const provider = new OAuthProvider('apple.com');
        await signInWithPopup(auth, provider);
    };

    const logout = async () => {
        if (fbUser) {
            await updateDoc(doc(db, 'users', fbUser.uid), { lastLogoutAt: new Date().toISOString() });
        }
        await signOut(auth);
        setCurrentProfile(null);
        window.location.reload();
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
        await updateDoc(doc(db, 'settings', 'global'), updates);
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
        if (!fbUser || !currentProfile) return;
        await updateDoc(doc(db, 'users', fbUser.uid, 'profiles', currentProfile.id), { avatarUrl: url });
    };

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

    return (
        <StoreContext.Provider value={{
            isAuthenticated,
            isLoading,
            login,
            signup,
            loginWithGoogle,
            loginWithApple,
            logout,
            content,
            users,
            currentUser,
            currentProfile,
            userProfiles,
            settings,
            sections,
            plans,
            notifications,
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
            unlockContent
        }}>
            {!isLoading && children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used within a StoreProvider');
    return context;
};