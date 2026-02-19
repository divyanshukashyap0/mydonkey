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

// In-memory throttle map to prevent spamming user updates
const lastUserUpdateMap: Record<string, number> = {};

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
    // COMPLETELY DISABLED PER USER REQUEST TO REDUCE WRITES
    return;
    if (!userId) return;

    try {
        // DISABLING ACTIVITY LOGS TO SAVE WRITES
        // The user requested to "close" activity logs.
        /*
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
        */

        // Update 'lastActiveAt' on user profile (Throttled to once per 5 mins)
        // This drastically reduces Writes
        const lastUpdate = lastUserUpdateMap[userId] || 0;
        const now = Date.now();
        if (now - lastUpdate > 5 * 60 * 1000) {
            const userRef = doc(db, 'users', userId);
            updateDoc(userRef, {
                lastActiveAt: serverTimestamp()
            }).catch(err => console.error("Failed to update lastActiveAt", err));

            lastUserUpdateMap[userId] = now;
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
    // COMPLETELY DISABLED PER USER REQUEST TO REDUCE WRITES
    return;
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
