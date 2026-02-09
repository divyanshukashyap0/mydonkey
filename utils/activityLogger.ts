import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

export type ActivityType =
    | 'login'
    | 'logout'
    | 'page_view'
    | 'video_play'
    | 'video_pause'
    | 'video_complete'
    | 'search'
    | 'plan_purchase'
    | 'profile_update';

/**
 * Logs a user action to the 'activity_logs' collection.
 */
export const logUserActivity = async (
    userId: string | undefined,
    email: string | undefined,
    action: ActivityType,
    details: any = {},
    isGuest: boolean = false
) => {
    if (!userId) return;

    try {
        await addDoc(collection(db, 'activity_logs'), {
            userId,
            email: email || 'unknown',
            action,
            details,
            isGuest, // Tagging guest logs
            timestamp: serverTimestamp(),
            // Helper for sorting/filtering
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown'
        });

        // Update 'lastActiveAt' on user profile for quick Online/Offline status
        // Skip for guests as they don't have a permanent user doc
        if (!isGuest) {
            const userRef = doc(db, 'users', userId);
            updateDoc(userRef, {
                lastActiveAt: serverTimestamp()
            }).catch(err => console.error("Failed to update lastActiveAt", err));
        }

    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

/**
 * Increments the user's total watch time by a specific amount (e.g., 10 seconds).
 * Call this periodically during playback.
 */
export const incrementWatchTime = async (userId: string, seconds: number) => {
    if (!userId || seconds <= 0) return;
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            totalWatchTimeSeconds: increment(seconds)
        });
    } catch (error) {
        console.error("Error incrementing watch time:", error);
    }
};
