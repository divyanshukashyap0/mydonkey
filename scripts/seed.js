import admin from 'firebase-admin';
import 'dotenv/config';

// Service Account Configuration from Environment Variables
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace actual newlines if primary key comes in as a string with literal \n
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Missing Firebase Service Account Environment Variables.');
    console.error('Expected: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- Mock Data Definitions ---

const PLANS = [
    {
        id: 'plan_basic',
        name: 'Basic',
        price: 199,
        currency: 'INR',
        interval: 'monthly',
        razorpayPlanId: 'plan_test_basic',
        features: ["Watch on 1 device", "Good quality", "720p resolution"],
        active: true,
        quality: 'Good',
        resolution: '720p'
    },
    {
        id: 'plan_standard',
        name: 'Standard',
        price: 499,
        currency: 'INR',
        interval: 'monthly',
        razorpayPlanId: 'plan_test_standard',
        features: ["Watch on 2 devices", "Better quality", "1080p resolution"],
        active: true,
        quality: 'Better',
        resolution: '1080p'
    },
    {
        id: 'plan_premium',
        name: 'Premium',
        price: 699,
        currency: 'INR',
        interval: 'monthly',
        razorpayPlanId: 'plan_test_premium',
        features: ["Watch on 4 devices", "Best quality", "4K+HDR resolution", "Download available"],
        active: true,
        quality: 'Best',
        resolution: '4K +HDR'
    }
];

const CONTENT = [
    {
        id: 'content_1',
        title: 'The Great Indian Mission',
        overview: 'A thrilling spy series about a multi-national mission to save the subcontinent from a digital virus.',
        poster_path: 'https://picsum.photos/400/600?random=1',
        backdrop_path: 'https://picsum.photos/1280/720?random=1',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'tv',
        genres: ['Action', 'Thriller'],
        release_date: '2026-01-15',
        vote_average: 8.5,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        featured: true,
        createdAt: new Date().toISOString(),
        tags: ['Mission', 'Tech', 'India']
    },
    {
        id: 'content_2',
        title: 'Laugh Out Loud: Bangalore',
        overview: 'Stand-up comedy specials from the best comedians in the Garden City.',
        poster_path: 'https://picsum.photos/400/600?random=2',
        backdrop_path: 'https://picsum.photos/1280/720?random=2',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'movie',
        genres: ['Comedy'],
        release_date: '2023-11-20',
        vote_average: 7.8,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_3',
        title: 'Space Odyssey 2026',
        comingSoon: true,
        overview: 'The definitive journey beyond the stars in the next generation of space travel.',
        poster_path: 'https://picsum.photos/400/600?random=3',
        backdrop_path: 'https://picsum.photos/1280/720?random=3',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'movie',
        genres: ['Sci-Fi', 'Adventure'],
        release_date: '2026-12-25',
        vote_average: 0,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_4',
        title: 'Love in Ladakh',
        overview: 'Two strangers find connection amidst the cold desert mountains of Leh.',
        poster_path: 'https://picsum.photos/400/600?random=4',
        backdrop_path: 'https://picsum.photos/1280/720?random=4',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'movie',
        genres: ['Romance', 'Drama'],
        release_date: '2026-02-14',
        vote_average: 7.2,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_5',
        title: 'Echoes of Mumbai',
        overview: 'A gritty urban drama following three loosely connected lives in the heart of Mumbai.',
        poster_path: 'https://picsum.photos/400/600?random=5',
        backdrop_path: 'https://picsum.photos/1280/720?random=5',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'tv',
        genres: ['Drama', 'Crime'],
        release_date: '2023-09-01',
        vote_average: 8.1,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_6',
        title: 'The Forest King',
        overview: 'An animated epic about the animals protected by a mystical guardian.',
        poster_path: 'https://picsum.photos/400/600?random=6',
        backdrop_path: 'https://picsum.photos/1280/720?random=6',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'movie',
        genres: ['Animation', 'Family'],
        release_date: '2026-05-10',
        vote_average: 8.9,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_7',
        title: 'Cyber Heist',
        overview: 'A group of ethical hackers attempt the impossible heist against a corrupt bank.',
        poster_path: 'https://picsum.photos/400/600?random=7',
        backdrop_path: 'https://picsum.photos/1280/720?random=7',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'movie',
        genres: ['Thriller', 'Action'],
        release_date: '2026-03-20',
        vote_average: 7.5,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_8',
        title: 'Master Chef: Desi Edition',
        overview: 'Top home cooks from across India compete to be the next culinary star.',
        poster_path: 'https://picsum.photos/400/600?random=8',
        backdrop_path: 'https://picsum.photos/1280/720?random=8',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'tv',
        genres: ['Reality', 'Food'],
        release_date: '2023-08-15',
        vote_average: 7.0,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_9',
        title: 'The Last Stand',
        overview: 'Historical documentary about the final battles of the Maratha Empire.',
        poster_path: 'https://picsum.photos/400/600?random=9',
        backdrop_path: 'https://picsum.photos/1280/720?random=9',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'movie',
        genres: ['Documentary', 'History'],
        release_date: '2023-12-10',
        vote_average: 8.0,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_10',
        title: 'Under the Stars',
        comingSoon: true,
        overview: 'A quiet meditative series about astronomy and the myths hidden in the constellations.',
        poster_path: 'https://picsum.photos/400/600?random=10',
        backdrop_path: 'https://picsum.photos/1280/720?random=10',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'tv',
        genres: ['Documentary', 'Educational'],
        release_date: '2027-01-01',
        vote_average: 0,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_11',
        title: 'Bollywood Beats',
        overview: 'Tracing the history of Bollywood music from the 50s to the present day.',
        poster_path: 'https://picsum.photos/400/600?random=11',
        backdrop_path: 'https://picsum.photos/1280/720?random=11',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'tv',
        genres: ['Music', 'Documentary'],
        release_date: '2023-10-05',
        vote_average: 7.9,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'content_12',
        title: 'Cricket Fever: MI',
        overview: 'A behind-the-scenes look at the most successful team in IPL history.',
        poster_path: 'https://picsum.photos/400/600?random=12',
        backdrop_path: 'https://picsum.photos/1280/720?random=12',
        youtubeId: 'dQw4w9WgXcQ',
        type: 'tv',
        genres: ['Sports', 'Documentary'],
        release_date: '2026-04-01',
        vote_average: 8.3,
        isPublished: true,
        allowDownload: true,
        allowPlayback: true,
        createdAt: new Date().toISOString()
    }
];

const SECTIONS = [
    {
        id: 'section_trending',
        title: 'Trending Now',
        order: 1,
        type: 'trending',
        enabled: true,
        scopes: ['home']
    },
    {
        id: 'section_originals',
        title: 'My Donkey Originals',
        order: 2,
        type: 'originals',
        enabled: true,
        scopes: ['tv', 'home']
    },
    {
        id: 'section_action',
        title: 'Action Movies',
        order: 3,
        type: 'genre',
        genreFilter: 'Action',
        enabled: true,
        scopes: ['movie', 'home']
    },
    {
        id: 'section_new',
        title: 'New & Popular',
        order: 4,
        type: 'curated',
        contentIds: ['content_1', 'content_5', 'content_12'],
        enabled: true,
        scopes: ['new', 'home']
    }
];

const SETTINGS = {
    siteName: "MY DONKEY",
    heroContentId: 'content_1',
    heroVideoQuality: "hd1080",
    maintenanceMode: false,
    contactEmail: ""
};

// --- Seeding Logic ---

async function seedCollection(collectionName, dataList) {
    let count = 0;
    for (const item of dataList) {
        const docId = item.id;
        const docRef = db.collection(collectionName).doc(docId);
        await docRef.set(item, { merge: true });
        count++;
    }
    console.log(`✅ Seeded ${count} items into collection: ${collectionName}`);
    return count;
}

async function runSeed() {
    console.log('🚀 Starting Database Seed...');

    try {
        // 1. Seed Settings
        await db.collection('settings').doc('global').set(SETTINGS, { merge: true });
        console.log('✅ Seeded System Settings (global)');

        // 2. Seed Plans
        const planCount = await seedCollection('plans', PLANS);

        // 3. Seed Content
        const contentCount = await seedCollection('content', CONTENT);

        // 4. Seed Sections
        const sectionCount = await seedCollection('sections', SECTIONS);

        // 5. Seed Admin User
        const adminUser = {
            uid: 'admin_test_uid',
            email: 'admin@example.com',
            role: 'admin',
            plan: 'Premium',
            subscriptionStatus: 'active',
            status: 'active',
            lastLoginAt: new Date().toISOString()
        };
        await db.collection('users').doc(adminUser.uid).set(adminUser, { merge: true });

        // Seed Profile for Admin
        const adminProfile = {
            id: 'profile_admin_1',
            name: 'Admin Me',
            avatarUrl: 'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
            isKids: false,
            myList: ['content_1', 'content_12']
        };
        await db.collection('users').doc(adminUser.uid).collection('profiles').doc(adminProfile.id).set(adminProfile, { merge: true });
        console.log('✅ Seeded Admin User and Profile');

        // 6. Seed Demo User
        const demoUser = {
            uid: 'demo_user_1',
            email: 'user@example.com',
            role: 'user',
            plan: 'Basic',
            subscriptionStatus: 'active',
            status: 'active',
            continueWatching: [
                { movieId: 'content_1', progress: 45, lastWatchedAt: new Date().toISOString(), stoppedAt: 1200, duration: 2400 },
                { movieId: 'content_5', progress: 10, lastWatchedAt: new Date().toISOString(), stoppedAt: 300, duration: 3000 }
            ]
        };
        await db.collection('users').doc(demoUser.uid).set(demoUser, { merge: true });

        const demoProfile = {
            id: 'profile_demo_1',
            name: 'Demo User',
            avatarUrl: 'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg',
            isKids: false,
            myList: []
        };
        await db.collection('users').doc(demoUser.uid).collection('profiles').doc(demoProfile.id).set(demoProfile, { merge: true });
        console.log('✅ Seeded Demo User and Profile');

        // 7. Seed Notifications
        const notification = {
            id: 'notif_1',
            title: 'New Content Added',
            message: 'The Great Indian Mission is now live! Start watching now.',
            type: 'content',
            link: '/content_1',
            createdAt: new Date().toISOString(),
            read: false
        };
        await db.collection('notifications').doc(notification.id).set(notification, { merge: true });
        console.log('✅ Seeded Notification');

        // 8. Seed Optional Logs
        const viewLog = {
            userId: 'demo_user_1',
            contentId: 'content_1',
            contentType: 'movie',
            genre: ['Action'],
            startedAt: new Date().toISOString(),
            watchDurationSeconds: 1200
        };
        await db.collection('viewing_logs').add(viewLog);
        console.log('✅ Seeded Viewing Log');

        console.log('\n--- 📊 Seeding Summary ---');
        console.log(`Users: 2`);
        console.log(`Content: ${contentCount}`);
        console.log(`Sections: ${sectionCount}`);
        console.log(`Plans: ${planCount}`);
        console.log('--------------------------');
        console.log('✨ Seeding Completed Successfully!');

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

runSeed();
