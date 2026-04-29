const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onQrSessionUpdated = functions.firestore
    .document("qr_sessions/{sessionId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        const sessionId = context.params.sessionId;

        // Only proceed if status changed from 'pending' to 'approved'
        if (newValue.status === "approved" && previousValue.status === "pending") {
            
            // Validate expiration
            const now = admin.firestore.Timestamp.now();
            const expiresAt = newValue.expiresAt;
            
            if (now.toMillis() > expiresAt.toMillis()) {
                console.log(`Session ${sessionId} has expired.`);
                await change.after.ref.update({
                    status: "expired"
                });
                return null;
            }

            // Ensure userId is present (set by the mobile app)
            const userId = newValue.userId;
            if (!userId) {
                console.error(`Session ${sessionId} approved but missing userId.`);
                return null;
            }

            try {
                // Generate a custom token for the user
                const customToken = await admin.auth().createCustomToken(userId);
                
                // Save the custom token to the session document so web app can read it
                await change.after.ref.update({
                    customToken: customToken,
                    approvedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`Successfully generated custom token for session ${sessionId} / user ${userId}`);

                // Optionally, store the session info in 'user_sessions' collection for device management
                await admin.firestore().collection("user_sessions").doc(sessionId).set({
                    userId: userId,
                    deviceName: newValue.deviceName || "Web Browser",
                    loginTime: admin.firestore.FieldValue.serverTimestamp(),
                    sessionId: sessionId
                });

            } catch (error) {
                console.error(`Error generating custom token for session ${sessionId}:`, error);
            }
        }
        return null;
    });

// Optional Scheduled Function to clean up expired QR sessions
exports.cleanupExpiredQRSessions = functions.pubsub.schedule("every 5 minutes").onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
        const expiredSessions = await db.collection("qr_sessions")
            .where("expiresAt", "<", now)
            .get();

        const batch = db.batch();
        expiredSessions.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Cleaned up ${expiredSessions.size} expired QR sessions.`);
    } catch (error) {
        console.error("Error cleaning up expired QR sessions:", error);
    }
    return null;
});
