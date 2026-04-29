# 🎬 My Donkey OTT Platform

> A full-featured, production-ready **Over-The-Top (OTT) streaming platform** built with React 19, Firebase, and TypeScript — inspired by Netflix. Stream movies, TV shows, anime, and exclusive content with a rich admin dashboard, subscription billing, multi-profile management, and Progressive Web App (PWA) support.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
  - [User-Facing Features](#user-facing-features)
  - [Admin Dashboard Features](#admin-dashboard-features)
  - [Technical Features](#technical-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
  - [Directory Structure](#directory-structure)
  - [Data Flow](#data-flow)
  - [Routing Architecture](#routing-architecture)
- [Pages & Routes](#-pages--routes)
- [Components Reference](#-components-reference)
- [Admin Dashboard Modules](#-admin-dashboard-modules)
- [API Reference](#-api-reference)
- [Data Models & Types](#-data-models--types)
- [State Management](#-state-management)
- [Authentication & Security](#-authentication--security)
  - [Firebase Auth](#firebase-auth)
  - [Firestore Security Rules](#firestore-security-rules)
  - [Role-Based Access Control](#role-based-access-control)
- [Integrations](#-integrations)
  - [Firebase](#firebase)
  - [Razorpay (Payments)](#razorpay-payments)
  - [TMDB API](#tmdb-api)
  - [YouTube Data API](#youtube-data-api)
  - [Google Gemini AI](#google-gemini-ai)
- [Video Playback System](#-video-playback-system)
- [Subscription & Billing System](#-subscription--billing-system)
- [PWA Support](#-pwa-support)
- [Internationalization (i18n)](#-internationalization-i18n)
- [SEO & Sitemap](#-seo--sitemap)
- [Environment Variables](#-environment-variables)
- [Installation & Local Setup](#-installation--local-setup)
- [Available Scripts](#-available-scripts)
- [Deployment](#-deployment)
  - [Vercel](#vercel)
  - [Firebase Hosting](#firebase-hosting)
- [Firestore Database Schema](#-firestore-database-schema)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**My Donkey OTT** is a feature-complete, scalable streaming platform that can serve as the foundation for any video-on-demand (VOD) or OTT business. It provides:

- A Netflix-like **user experience** with hero banners, content rails, and a full-screen video player
- A **powerful admin CMS** to manage all content, users, subscriptions, and site settings
- **Multi-profile user accounts** (like Netflix profiles) with individual watchlists and progress tracking
- **Exclusive content** gated behind password/unlock codes
- **Subscription billing** via Razorpay with plan management
- **Deep linking** for direct content access via URL
- **PWA installability** — can be used as a native-like app on mobile devices

---

## ✨ Features

### User-Facing Features

| Feature | Description |
|---|---|
| 🏠 **Home Feed** | Dynamic, admin-controlled sections with hero banner and content rails |
| 🎬 **Movies Library** | Paginated grid of all movies with lazy-loaded posters |
| 📺 **TV Shows Library** | Full TV show library with seasons and episode management |
| 🌸 **Anime Section** | Dedicated anime section with animated background video and genre filters |
| 📋 **My List** | Personal watchlist per profile, persisted in Firestore |
| 🔍 **Search** | Full-text search across all content types without saving search history |
| 👤 **Multi-Profile** | Create and switch between multiple user profiles (kids-safe aware) |
| ⚙️ **Account Settings** | Update name, password, manage devices, view billing history |
| 🔒 **Exclusive Content** | Password-gated hidden content, unlockable with a global or per-item code |
| 📱 **Content Request** | Users can request specific movies or shows |
| 🔔 **Notifications** | Admin-controlled push notification banners |
| ⏩ **Continue Watching** | Resume from last stopped timestamp, tracked per profile |
| 📺 **TV Device Activation** | Enter a code to activate a TV/smart device for streaming |
| 🎵 **YouTube Music Player** | Browse and play music from YouTube with a built-in songs player |
| ⚡ **Sparks Feed** | Short-form video content (like Reels/Shorts) |
| 🏟️ **Live Sports** | Dedicated live sports section with match info |
| 📥 **Download Links** | Per-quality download links (1080p, 4K, etc.) if enabled |
| 🌐 **i18n / Multilingual** | Multi-language support via i18next |
| 📱 **Mobile Navigation** | Dedicated bottom nav bar for mobile devices |
| 🌙 **Dark UI** | Netflix-style dark theme throughout |
| 🔢 **Content Rating** | Censor ratings shown (U/A 16+, etc.) |
| 💫 **Anime Intro Animation** | Animated intro/outro on entering/leaving the Anime section |

### Admin Dashboard Features

| Module | Description |
|---|---|
| 📦 **Content Manager** | Full CRUD for movies and TV shows, episode management, TMDB autofill |
| 🗂️ **Section Manager** | Create and order homepage sections (trending, genre, tags, curated, etc.) |
| 👥 **Users Manager** | View, block/unblock users, change roles, view watch history |
| 💰 **Plan Manager** | Create and manage subscription plans with Razorpay integration |
| 📜 **Pages Manager** | Create and manage static info pages (About, FAQ, Privacy Policy, etc.) |
| 🎨 **Appearance Manager** | Set site name, theme, fonts (hero, rank, body), hero content |
| 🏷️ **Anime Manager** | Dedicated CRUD and bulk episode management for anime content |
| 📊 **Analytics Manager** | View site-wide viewing stats, most-watched content, active users |
| 🔐 **Exclusive Content Manager** | Manage access codes for exclusive gated content |
| 🟢 **Coming Soon Manager** | Mark content as "coming soon" with status flags |
| 📤 **Export Manager** | Export content data to Excel (XLSX) for offline management |
| 📋 **Requests Manager** | View and manage user content requests with priority and status |
| ⚙️ **Settings Manager** | Global site settings: maintenance mode, content loader, exclusive code |

### Technical Features

- ⚡ **Vite 6** build tooling with code-splitting and chunking
- 🔥 **Firebase 12** (Firestore, Auth, Storage)
- 🌊 **HLS.js** for HTTP Live Streaming (m3u8) support
- 📦 **PWA** via `vite-plugin-pwa` with auto-update service worker
- 🔗 **Deep Linking** — `/browse/:id` and `/watch/:id` URLs
- 🖼️ **React Helmet Async** for per-page SEO meta tags
- 🗺️ **Auto Sitemap Generation** from Firestore content
- 📊 **Activity Logging** — user page views and actions saved to Firestore
- 🧠 **Gemini AI** integration for AI-generated content descriptions
- 🎛️ **Vercel Serverless Functions** for proxied YouTube API and song search
- 📱 **Responsive** — mobile-first design with Tailwind CSS

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 |
| **Language** | TypeScript 5.8 |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 3.4 + custom `index.css` |
| **Routing** | React Router DOM v7 |
| **State Management** | React Context API (`StoreContext`) |
| **Backend / Database** | Firebase Firestore (NoSQL) |
| **Authentication** | Firebase Authentication |
| **File Storage** | Firebase Storage |
| **Payments** | Razorpay (subscriptions + one-time) |
| **Video Playback** | YouTube IFrame API, HLS.js, Google Drive embeds |
| **Metadata API** | TMDB (The Movie Database) |
| **Music API** | YouTube Data API v3 (via Vercel serverless proxy) |
| **AI** | Google Gemini AI (`@google/genai`) |
| **Icons** | Lucide React |
| **Internationalization** | i18next + react-i18next + browser language detector |
| **SEO** | react-helmet-async |
| **PWA** | vite-plugin-pwa (Workbox) |
| **Export** | xlsx (SheetJS) |
| **Deployment** | Vercel (primary) / Firebase Hosting (alternative) |

---

## 🏗️ Project Architecture

### Directory Structure

```
my-donkey-ott/
│
├── api/                          # Vercel Serverless Functions
│   ├── songs.js                  # YouTube music search & song fetching proxy
│   └── content-seo.js            # SEO metadata API for content pages
│
├── components/                   # All React UI components
│   ├── admin/                    # Admin-only components
│   │   ├── AdminLayout.tsx       # Admin sidebar + layout wrapper
│   │   ├── UsersModule.tsx       # User management UI
│   │   └── modules/              # Individual admin module pages
│   │       ├── ContentManager.tsx        # Movie/TV CRUD (largest file ~85KB)
│   │       ├── AnimeManager.tsx          # Anime-specific CRUD with bulk episodes
│   │       ├── SectionManager.tsx        # Homepage section configuration
│   │       ├── PlanManager.tsx           # Subscription plan management
│   │       ├── PagesManager.tsx          # Static page CMS
│   │       ├── SettingsManager.tsx       # Global site settings
│   │       ├── AppearanceManager.tsx     # Theme, fonts, hero config
│   │       ├── AnalyticsManager.tsx      # Analytics dashboard
│   │       ├── AnalyticsData.tsx         # Analytics chart sub-component
│   │       ├── ExclusiveContentManager.tsx # Exclusive content access codes
│   │       ├── ComingSoonManager.tsx     # Coming soon content
│   │       ├── ExportManager.tsx         # Data export to Excel
│   │       └── RequestsManager.tsx       # User content requests
│   │
│   ├── account/                  # Account-related sub-components
│   │   └── BillingHistoryModal.tsx  # Invoice history modal
│   │
│   ├── ui/                       # Reusable generic UI primitives
│   │
│   ├── AccountSettings.tsx       # Full account settings page
│   ├── ActivateDevice.tsx        # TV device code activation
│   ├── AnimeIntro.tsx            # Animated intro for the Anime section
│   ├── AppleLogo.tsx             # Apple logo SVG component
│   ├── ContentDetails.tsx        # Content detail modal (largest component ~49KB)
│   ├── ContentLoader.tsx         # Animated content loading skeleton
│   ├── ContentRail.tsx           # Horizontal scrollable content row
│   ├── ContentRequestInline.tsx  # Inline content request form
│   ├── DrivePlayer.tsx           # Google Drive video player component
│   ├── ExclusiveContentPage.tsx  # Password-gated exclusive content page
│   ├── FontLoader.tsx            # Google Fonts dynamic loader
│   ├── Footer.tsx                # Site footer with dynamic links
│   ├── HeroBanner.tsx            # Full-screen animated hero banner
│   ├── HeroSkeleton.tsx          # Skeleton loader for hero
│   ├── InfoPage.tsx              # Generic info/static page renderer
│   ├── LiveSportsRail.tsx        # Live sports content scrollable rail
│   ├── Loader.tsx                # Full-screen loading spinner
│   ├── LoginPage.tsx             # Auth page (email + Google sign-in)
│   ├── MobileNav.tsx             # Bottom navigation for mobile
│   ├── NotFound.tsx              # 404 page component
│   ├── Pagination.tsx            # Pagination component for grids
│   ├── PlayPasswordModal.tsx     # Password prompt for protected content
│   ├── ProfileSelection.tsx      # Netflix-style profile picker
│   ├── RequestContent.tsx        # Full-page content request form
│   ├── SearchPage.tsx            # Search UI with no history saving
│   ├── ScrollToTop.tsx           # Auto-scrolls to top on route change
│   ├── SongsList.tsx             # List of songs/tracks
│   ├── SongsPlayer.tsx           # YouTube music player
│   ├── SongsSection.tsx          # Music section in content details
│   ├── SparksFeed.tsx            # Short-form vertical video feed
│   ├── StatsPanel.tsx            # Content statistics panel
│   ├── TopNav.tsx                # Main top navigation bar
│   ├── UnlockContentModal.tsx    # Global exclusive content unlock modal
│   └── VideoPlayer.tsx           # Full-screen video player (largest file ~71KB)
│
├── context/
│   └── StoreContext.tsx          # Global state — all Firestore data, auth, actions
│
├── services/
│   ├── tmdbService.ts            # TMDB API calls: search, metadata, episode fetch
│   ├── youtubeService.ts         # YouTube Data API integration
│   └── geminiService.ts          # Google Gemini AI text generation
│
├── utils/
│   ├── activityLogger.ts         # Logs user page views/actions to Firestore
│   ├── emailService.ts           # Email notification utility
│   ├── haptics.ts                # Mobile haptic feedback utility
│   └── premiumDescriptions.ts   # AI-enhanced content description templates
│
├── scripts/
│   ├── seed.js                   # Seeds Firestore with initial content data
│   ├── generate-sitemap.cjs      # Generates sitemap.xml from Firestore content
│   ├── check_content.cjs         # Validates content data in Firestore
│   ├── check_content_client.js   # Client-side content check script
│   ├── dump-content.cjs          # Dumps Firestore content to JSON
│   └── dump-tv.cjs               # Dumps TV show data to JSON
│
├── pages/
│   └── marketing/                # Marketing landing pages
│
├── layouts/                      # Layout wrappers
│
├── data/                         # Static data files
│
├── public/                       # Static public assets (icons, videos, etc.)
│
├── locales/                      # i18n translation files
│
├── AppNew.tsx                    # Root application component (routes + layout)
├── index.tsx                     # React entry point (BrowserRouter + App mount)
├── index.html                    # HTML shell with meta tags
├── types.ts                      # All TypeScript type definitions
├── constants.ts                  # App-wide constants and configuration
├── firebase.ts                   # Firebase app initialization
├── firestore.rules               # Firestore security rules
├── firebase.json                 # Firebase hosting configuration
├── vite.config.ts                # Vite configuration with PWA + local API plugin
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment configuration
└── package.json                  # Project metadata and dependencies
```

### Data Flow

```
User Action (click / navigate)
        │
        ▼
React Component (e.g. ContentRail)
        │
        ▼
StoreContext (context/StoreContext.tsx)
  ├── Reads from: Firestore (real-time listeners)
  ├── Writes to: Firestore (via admin actions)
  └── Exposes: content, users, settings, auth, profiles
        │
        ▼
Firebase Firestore (live data sync)
        │
        ▼
UI Re-renders with updated data
```

### Routing Architecture

The application uses **React Router v7** with `BrowserRouter`. All routing is managed in `AppNew.tsx`:

```
/login               → LoginPage
/admin/*             → AdminLayout (protected: admin role only)
/*                   → MainLayout (all public + authenticated routes)
  ├── /home          → Home feed with hero + dynamic sections
  ├── /movies        → Paginated movie grid
  ├── /tv            → Paginated TV shows grid
  ├── /anime         → Anime library with animated background
  ├── /my-list       → Personal watchlist (auth required)
  ├── /search        → Search results page
  ├── /exclusive     → Exclusive / gated content page
  ├── /account       → Account settings (auth required)
  ├── /request       → Content request form
  ├── /browse/:id    → Content detail modal (deep link)
  ├── /watch/:id     → Video player (deep link, auth for movies)
  ├── /:pageSlug     → Dynamic admin-created info pages
  └── /404 or *      → 404 Not Found page
```

---

## 📄 Pages & Routes

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/home` | `MainLayout` → Home | ❌ | Hero banner + dynamic content sections |
| `/movies` | `MainLayout` → Movies | ❌ | Full movie library, paginated |
| `/tv` | `MainLayout` → TV Shows | ❌ | Full TV shows library, paginated |
| `/anime` | `MainLayout` → Anime | ❌ | Anime section with animated BG video |
| `/my-list` | `MainLayout` → My List | ✅ | Personal watchlist |
| `/search` | `SearchPage` | ❌ | Search content |
| `/exclusive` | `ExclusiveContentPage` | ❌ (code-gated) | Password-protected premium content |
| `/account` | `AccountSettings` | ✅ | Profile, billing, devices |
| `/request` | `RequestContent` | ❌ | Request a movie or show |
| `/login` | `LoginPage` | ❌ | Email & Google login |
| `/browse/:id` | Content detail modal | ❌ | Deep link to content details |
| `/watch/:id` | `VideoPlayer` | ✅ (for movies) | Deep link to video player |
| `/admin/*` | `AdminLayout` | ✅ (admin role) | Admin dashboard |
| `/:slug` | `InfoPage` | ❌ | Dynamic pages (About, FAQ, etc.) |
| `/404` | `NotFound` | ❌ | 404 error page |

---

## 🧩 Components Reference

### Core Layout Components

#### `TopNav.tsx`
The main navigation bar at the top. Features:
- Logo with site name from settings
- Navigation tabs (Home, Movies, TV Shows, Anime, My List, etc.)
- Search icon
- Notification bell with unread count
- User avatar dropdown (Account, Profiles, Admin link, Logout)
- Guest mode indicator
- Unlock exclusive content button

#### `MobileNav.tsx`
Bottom navigation bar for mobile screens with icons for Home, Movies, TV, Search, and Account.

#### `Footer.tsx`
Site footer with dynamic links generated from admin-created pages, grouped by category (Company, Support, Legal, Connect).

#### `HeroBanner.tsx`
Full-screen hero section for the home page. Features:
- Background video (YouTube autoplay, muted)
- Content title, overview, ratings
- Play and More Info buttons
- Mobile-optimized backdrop
- Smooth fade-in animations

#### `ContentRail.tsx`
Horizontal scrollable row of content thumbnails. Supports:
- Top 10 ranking style with large numbers
- Regular poster grid
- Hover effects and details navigation

### Content & Player Components

#### `VideoPlayer.tsx` (~71KB — the most complex component)
Full-featured video player supporting multiple source types:
- **YouTube IFrame API** — with quality control and full-screen
- **HLS.js** — for `.m3u8` live/VOD streams
- **Google Drive** — via embedded DrivePlayer
- **Direct video URL** — native `<video>` element

Features:
- Resume from last position (continue watching)
- Watch time tracking to Firestore
- Episode selector for TV shows
- Picture-in-Picture support
- Auto-fullscreen on mobile
- Custom controls (play/pause, seek, volume, quality, fullscreen)
- Loading spinner with minimum display time
- Episode auto-navigation

#### `ContentDetails.tsx` (~49KB)
Large modal/sheet showing full content details:
- Poster, backdrop, title, overview, cast, genres, rating
- Season and episode list for TV shows
- TMDB-fetched episode thumbnails
- Play trailer / Play movie buttons
- Add to My List toggle
- Songs section (YouTube music integration)
- Reviews section
- Download links
- Related content


#### `DrivePlayer.tsx`
Embeds Google Drive hosted videos using an iframe with controls.

#### `ProfileSelection.tsx`
Netflix-style profile selection screen shown after login. Supports multiple profiles per user including Kids profile.

### Admin Components

#### `AdminLayout.tsx`
Main admin shell with collapsible sidebar, breadcrumbs, and module routing. Protected — redirects non-admin users.

#### `UsersModule.tsx`
Full user management table with:
- Search and filter users
- View profile details, subscription status
- Block / unblock users
- Change user roles
- View last active time and watch history

---

## 🔧 Admin Dashboard Modules

### Content Manager (`ContentManager.tsx`)
The central CMS for all video content. Features:
- Add / Edit / Delete movies and TV shows
- TMDB autofill (search by title, auto-populate metadata)
- Bulk episode import by pasting YouTube/Drive links
- Episode TMDB metadata fetch (thumbnails, titles)
- Set video sources: YouTube ID, Google Drive ID, direct URL
- Toggle download, playback, publish, featured, exclusive, original flags
- Assign genres, tags, cast, director, creators
- Set resolution (SD / HD / 4K), censor rating
- Per-quality download links

### Section Manager (`SectionManager.tsx`)
Control what content rows appear on the homepage and catalog pages:
- Create sections with types: Trending, Genre, Originals, New Movies, New TV, Curated, My List, Tag
- Drag-and-order sections
- Set which pages a section appears on (Home, Movies, TV, New)
- Enable/disable sections
- Assign specific content IDs to curated sections
- Toggle ranking numbers (Top 10 style)

### Plan Manager (`PlanManager.tsx`)
Manage subscription plans visible to users:
- Create plans with price, currency, interval (monthly/yearly)
- Set quality tier (Good / Better / Best), resolution (720p / 1080p / 4K+HDR)
- Toggle ads, set max devices
- Link to Razorpay Plan IDs for automated billing
- Enable/disable plan visibility


### Pages Manager (`PagesManager.tsx`)
Built-in CMS for static information pages:
- Create pages with slug (used as URL), title, category
- Build page sections with: heading, text content, bullet lists, numbered steps, buttons
- Categories: Company, Support, Legal, Connect
- Pages auto-appear in the footer nav

### Appearance Manager (`AppearanceManager.tsx`)
Visual configuration:
- Site name
- Theme: `default` or `luxury`
- Body font, Hero font, Rank font (from Google Fonts)
- Hero content selection (which item appears on the home banner)
- Hero video quality (auto / 720p / 1080p / highres)

### Analytics Manager (`AnalyticsManager.tsx`)
Platform-wide analytics:
- Total views, total watch time
- Most-watched content
- Active users (last 24h, 7d, 30d)
- User activity logs timeline
- Content type breakdown

### Settings Manager (`SettingsManager.tsx`)
Global platform settings:
- Maintenance mode (shows maintenance page to all users)
- Content loader (animated intro before content appears, with configurable duration)
- Global exclusive unlock code
- Contact email

### Export Manager (`ExportManager.tsx`)
Export all platform data to Excel (`.xlsx`):
- Export all content with metadata
- Export user list
- Export subscription records
- Useful for offline backup and reporting

---

## 🔌 API Reference

### Vercel Serverless Functions (`/api/`)

#### `GET /api/songs?movie=<title>`
Fetches a list of YouTube songs/tracks related to a movie or show title.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `movie` | string | The movie/show title to search music for |

**Response:**
```json
{
  "songs": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Song Title",
      "channelTitle": "Artist Name",
      "thumbnail": "https://...",
      "duration": "3:32"
    }
  ]
}
```

#### `GET /api/content-seo?id=<contentId>`
Returns SEO metadata for a content item (used by server-side rendering or bots).

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `id` | string | Firestore content document ID |

---

## 📐 Data Models & Types

All types are defined in `types.ts`.

### `Content`
The primary content item (movie, TV show, anime, sparks, sports, trailer).

```typescript
interface Content {
  id: string;
  tmdbId?: number;           // TMDB series ID for autofill
  title: string;
  overview: string;
  poster_path: string;
  poster_path_mobile?: string;
  backdrop_path: string;
  backdrop_path_mobile?: string;
  youtubeId: string;         // Trailer YouTube ID
  movieDriveId?: string;     // Movie Google Drive file ID
  movieYoutubeId?: string;   // Movie YouTube ID
  videoUrl?: string;         // Direct video URL
  allowDownload?: boolean;
  allowPlayback?: boolean;
  isPublished?: boolean;
  type: 'movie' | 'tv' | 'sparks' | 'sports' | 'short' | 'trailer';
  genres: string[];
  release_date: string;
  vote_average: number;
  featured?: boolean;
  views?: number;
  likes?: number;
  createdAt: string;
  cast?: string[];
  tags?: string[];
  comingSoon?: boolean;
  duration?: number | string;
  accessCode?: string;       // Per-item unlock code
  isExclusive?: boolean;     // Hidden unless unlocked
  seasons?: Season[];
  rating?: string;           // e.g. "U/A 16+"
  resolution?: 'HD' | '4K' | 'SD';
  isOriginal?: boolean;
  director?: string;
  creators?: string[];
  downloadLinks?: DownloadLink[];
}
```

### `User`
```typescript
interface User {
  uid: string;
  email: string;
  name?: string;
  plan: string;              // Plan ID
  role?: 'user' | 'admin' | 'guest';
  status?: 'active' | 'blocked';
  totalWatchTime?: number;
  continueWatching?: ContinueWatchingItem[];
  lowDataMode?: boolean;
  autoplayEnabled?: boolean;
  autoFullscreen?: boolean;
  bypassPassword?: boolean;  // Skip all access code checks
  isGuest?: boolean;
}
```

### `Profile`
```typescript
interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  isKids: boolean;
  myList: string[];           // Array of content IDs
  unlockedContent?: string[]; // Unlocked exclusive content IDs
  subscription?: Subscription;
}
```

### `Section`
```typescript
interface Section {
  id: string;
  title: string;
  order: number;
  type: 'trending' | 'genre' | 'curated' | 'originals' | 
        'new_movies' | 'new_tv' | 'my_list' | 'tag';
  genreFilter?: string;
  tagFilter?: string;
  contentIds?: string[];      // For curated sections
  enabled: boolean;
  scopes: ('home' | 'tv' | 'movie' | 'new')[];
  showRanking?: boolean;      // Top 10 style ranking
}
```

### `Plan`
```typescript
interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  interval?: 'monthly' | 'yearly';
  razorpayPlanId?: string;
  features: string[];
  quality: 'Good' | 'Better' | 'Best';
  resolution: '720p' | '1080p' | '4K +HDR';
  maxDevices?: number;
  ads?: boolean;
  active?: boolean;
}
```

### `SiteSettings`
```typescript
interface SiteSettings {
  siteName: string;
  heroContentId?: string;
  heroVideoQuality?: 'auto' | 'hd720' | 'hd1080' | 'highres';
  maintenanceMode: boolean;
  contactEmail?: string;
  theme?: 'default' | 'luxury';
  websiteFont?: string;
  rankFont?: string;
  heroFont?: string;
  globalExclusiveCode?: string;
  contentLoaderEnabled?: boolean;
  contentLoaderDuration?: number;
}
```

---

## 🗂️ State Management

All global state lives in `context/StoreContext.tsx` (a single large React Context + hooks). It provides:

| State | Type | Description |
|---|---|---|
| `content` | `Content[]` | All **published** content items |
| `rawContent` | `Content[]` | All content including unpublished |
| `sections` | `Section[]` | Homepage/catalog section config |
| `plans` | `Plan[]` | Subscription plans |
| `settings` | `SiteSettings` | Global site settings |
| `pages` | `Page[]` | Dynamic info pages |
| `currentUser` | `User \| null` | Logged-in user object |
| `currentProfile` | `Profile \| null` | Active selected profile |
| `isAuthenticated` | `boolean` | Auth state flag |
| `isLoading` | `boolean` | Initial load state |
| `notifications` | `Notification[]` | Admin notifications |

**Key Actions exported from store:**
- `login(email, password)` / `logout()`
- `loginWithGoogle()`
- `loginAsGuest()`
- `createProfile(data)` / `switchProfile(id)` / `deleteProfile(id)`
- `addToMyList(contentId)` / `removeFromMyList(contentId)`
- `incrementViews(contentId)`
- `saveContinueWatching(item, stoppedAt, duration)`
- `unlockExclusiveContent(code)`
- `submitContentRequest(data)`

---

## 🔐 Authentication & Security

### Firebase Auth

Authentication is handled by Firebase Auth with:
- **Email + Password** sign-in
- **Google OAuth** sign-in (popup)
- **Guest / Anonymous** access — limited features
- Session persistence via `browserLocalPersistence`

### Firestore Security Rules

Security is enforced server-side via `firestore.rules`:

```
Helper functions:
  isAuthenticated()   → request.auth != null
  isOwner(userId)     → auth.uid == userId
  isAdmin()           → user document has role == 'admin'
```

| Collection | Read | Write |
|---|---|---|
| `/content` | Public | Admin only |
| `/sections` | Public | Admin only |
| `/plans` | Public | Admin only |
| `/settings` | Public | Admin only |
| `/notifications` | Public | Admin only |
| `/pages` | Public | Admin only |
| `/users/{uid}` | Owner + Admin | Owner (limited fields) + Admin |
| `/users/{uid}/profiles` | Owner + Admin | Owner + Admin |
| `/users/{uid}/billing` | Owner + Admin | Admin only |
| `/requests` | Admin only | Authenticated users (create) |
| `/activity_logs` | Admin only | Authenticated users (create) |

### Role-Based Access Control

| Role | Capabilities |
|---|---|
| `guest` | Browse public content, watch trailers |
| `user` | All guest perks + watch movies, manage watchlist, request content |
| `admin` | All user perks + full admin dashboard access |

Users with `bypassPassword: true` skip all content unlock code prompts.

---

## 🔗 Integrations

### Firebase

The app uses **Firebase v12**. Initialize in `firebase.ts` with Firestore, Auth, Storage, and Analytics. All Firebase config values come from environment variables prefixed `VITE_FIREBASE_*`.

**Real-time listeners** are set up in `StoreContext` for:
- `/content` — live content updates
- `/sections` — live section updates  
- `/settings/site` — live settings updates
- `/plans` — live plan updates
- `/pages` — live page updates
- `/users/:uid` — live user profile sync

### Razorpay (Payments)

Razorpay is integrated for subscription billing:
- Plans are linked to Razorpay Plan IDs
- The Razorpay checkout script is loaded dynamically
- `window.Razorpay` is used to open the payment modal
- Payment webhooks update `subscriptionStatus` in Firestore

> ⚠️ Razorpay is currently configured with **test keys**. Replace with live keys before production launch.

### TMDB API

**The Movie Database** API is used via `services/tmdbService.ts` for:
- Searching movies and TV shows by title
- Fetching posters, backdrops, overviews, cast, ratings
- Fetching season and episode metadata (titles, thumbnails, air dates)
- Batch autofill when adding content in the admin dashboard

API Key is set via `VITE_TMDB_API_KEY`.

### YouTube Data API

Used via `services/youtubeService.ts` and the `/api/songs.js` Vercel serverless proxy:
- Fetch video metadata (title, thumbnail, duration)
- Search for songs related to a movie/show
- The proxy keeps the API key server-side for security

API Key is set via `YOUTUBE_API_KEY` (server) and `VITE_YOUTUBE_API_KEY` (client).

### Google Gemini AI

Integrated via `@google/genai` in `services/geminiService.ts`:
- Generates premium AI-enhanced content descriptions
- Can be used for auto-generating summaries or content blurbs
- Key is read from `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY`

---

## 🎬 Video Playback System

The `VideoPlayer.tsx` component is the heart of the platform. It handles four source types:

| Source Type | Detection | Player Used |
|---|---|---|
| YouTube | `movieYoutubeId` field | YouTube IFrame API |
| HLS Stream | `videoUrl` ending in `.m3u8` | HLS.js |
| Google Drive | `movieDriveId` field | `DrivePlayer` iframe |
| Direct Video | any other `videoUrl` | Native `<video>` element |

### Continue Watching
- When a user plays a video, progress is periodically saved to Firestore under `users/{uid}` → `continueWatching[]`
- On re-open, the player seeks to `stoppedAt` seconds automatically

### Episode Playback (TV Shows)
- Episodes are listed in a collapsible panel within the player
- Clicking an episode swaps the source without closing the player
- Episode metadata (thumbnails, titles) is fetched from TMDB

---

## 💳 Subscription & Billing System

1. **Admin** creates plans in Plan Manager → optionally links to Razorpay Plan ID
2. **User** views plans on the Account Settings / upgrade modal
3. **Razorpay checkout** is opened client-side with the plan details
4. On successful payment:
   - A Subscription record is created in Firestore
   - The user's `plan` and `subscriptionStatus` fields are updated
5. **Billing history** (invoices) is viewable in Account Settings → Billing tab
6. **Active subscriptions** control access to premium content (movies require authentication)

---

## 📱 PWA Support

The app is a **Progressive Web App** configured via `vite-plugin-pwa`:

- **Auto-update**: Service worker updates automatically in background
- **Installable**: Users can install to home screen on Android and iOS (Add to Home Screen)
- **Pre-caching**: Core assets, fonts, and JS chunks are cached by Workbox
- **Manifest**: Configured with app name "My Donkey OTT", short name "MyDonkey", icons at 192×192 and 512×512
- **Offline-first**: Cached content is served when offline

---

## 🌐 Internationalization (i18n)

The platform uses **i18next** for multi-language support:

- **`react-i18next`** — React bindings
- **`i18next-browser-languagedetector`** — Auto-detects browser language
- Translation files live in the `locales/` directory
- Language switching can be triggered from the UI

---

## 🗺️ SEO & Sitemap

### On-Page SEO
Every page uses `react-helmet-async` to set:
- `<title>` tags with content name + site name
- `<meta name="description">` with content overview
- Open Graph tags (`og:title`, `og:image`, `og:description`)
- `<link rel="canonical">` for deep-linked content pages

### Sitemap Generation
Run the sitemap script to generate `sitemap.xml` from all Firestore content:

```bash
npm run sitemap
```

The script (`scripts/generate-sitemap.cjs`) fetches all published content from Firestore and writes a sitemap with:
- Content detail page URLs (`/browse/:id`)
- `<video:video>` structured data blocks with title, description, thumbnail
- `lastmod` dates based on `createdAt`

---

## ⚙️ Environment Variables

Create a `.env` file at the project root with the following variables:

```env
# ─── Firebase Configuration ───────────────────────────────────────────────────
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ─── Razorpay (Payments) ──────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# ─── TMDB (Movie Database) ────────────────────────────────────────────────────
# Get free API key at: https://www.themoviedb.org/settings/api
VITE_TMDB_API_KEY=your_tmdb_api_key

# ─── YouTube Data API v3 ──────────────────────────────────────────────────────
# Server-side only (do NOT prefix with VITE_ for server functions)
# Get at: https://console.cloud.google.com → APIs & Services → YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_server_api_key

# Client-side YouTube (for metadata only)
VITE_YOUTUBE_API_KEY=your_youtube_client_api_key

# ─── Google Gemini AI ─────────────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

> 🔒 **Security Warning**: Never commit your `.env` file to version control. The `.gitignore` already excludes it.

---

## 🚀 Installation & Local Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Firebase project** with Firestore, Auth, and Storage enabled
- A **TMDB API key** (free at [themoviedb.org](https://www.themoviedb.org/settings/api))
- (Optional) A **Razorpay** account for payment testing
- (Optional) A **YouTube Data API v3** key from Google Cloud Console

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/my-donkey-ott.git
cd my-donkey-ott
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Copy and fill in your environment variables:

```bash
cp .env.example .env
# Edit .env with your actual keys
```

### Step 4: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project
2. Enable **Authentication** → Email/Password and Google providers
3. Create a **Firestore Database** in production mode
4. Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

### Step 5: Seed Initial Data (Optional)

Populate Firestore with some starter content:

```bash
npm run seed
```

### Step 6: Start the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

> 💡 The Vite dev server includes a built-in local API plugin (`localApiPlugin` in `vite.config.ts`) that serves the Vercel serverless functions from `/api/` without needing the Vercel CLI.

### Step 7: Create an Admin User

1. Register a new account through the app
2. In the Firebase Console → Firestore → `users` collection → find your user document
3. Set `role: "admin"`
4. Log out and back in — you'll now see the Admin link in the nav

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| **Dev server** | `npm run dev` | Starts Vite at `http://localhost:3000` with HMR |
| **Build** | `npm run build` | Production build to `./dist/` |
| **Preview** | `npm run preview` | Preview the production build locally |
| **Seed DB** | `npm run seed` | Seeds Firestore with sample content data |
| **Sitemap** | `npm run sitemap` | Generates `public/sitemap.xml` from Firestore |

---

## ☁️ Deployment

### Vercel

Vercel is the **recommended** deployment target. The serverless API functions in `/api/` are automatically deployed as Vercel Functions.

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Configure `vercel.json` (already included):
   ```json
   {
     "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
   }
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Add all environment variables in the **Vercel Dashboard** → Project Settings → Environment Variables.

### Firebase Hosting

As an alternative, deploy to Firebase Hosting:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

The `firebase.json` is already configured to serve from `./dist/` and rewrite all routes to `index.html` for SPA support.

---

## 🗄️ Firestore Database Schema

```
firestore/
│
├── content/                      # All content items
│   └── {contentId}/
│       ├── title, overview, type, genres, ...
│       └── seasons[] → episodes[] (nested arrays)
│
├── sections/                     # Homepage section config
│   └── {sectionId}/
│       ├── title, type, order, enabled, scopes
│       └── contentIds[], genreFilter, tagFilter
│
├── plans/                        # Subscription plans
│   └── {planId}/
│       ├── name, price, interval, quality, resolution
│       └── razorpayPlanId, features[], active
│
├── settings/                     # Global site settings
│   └── site/
│       ├── siteName, theme, fonts
│       ├── heroContentId, popup, maintenanceMode
│       └── globalExclusiveCode, contentLoader*
│
├── notifications/                # Admin-sent notifications
│   └── {notificationId}/
│       └── title, message, type, link, image, createdAt
│
├── pages/                        # Dynamic info pages
│   └── {pageSlug}/
│       ├── title, category, description
│       └── sections[] → { heading, content, listItems, steps, buttonLabel, buttonLink }
│
├── requests/                     # User content requests
│   └── {requestId}/
│       ├── userId, userEmail, userName, contentTitle
│       ├── status: 'pending' | 'approved' | 'processing' | 'fulfilled' | 'rejected'
│       └── priority, adminNote, createdAt, updatedAt
│
├── activity_logs/                # User activity events
│   └── {logId}/
│       ├── userId, email, action, data
│       └── timestamp, isGuest
│
└── users/                        # User accounts
    └── {uid}/
        ├── email, name, plan, role, status
        ├── subscriptionStatus, razorpayCustomerId
        ├── totalWatchTime, continueWatching[]
        ├── lowDataMode, autoplayEnabled, autoFullscreen
        ├── readNotifications[], tokenVersion
        ├── lastLoginAt, lastLogoutAt, lastActiveAt
        │
        ├── profiles/             # Sub-collection: user profiles
        │   └── {profileId}/
        │       ├── name, avatarUrl, isKids
        │       └── myList[], unlockedContent[]
        │
        ├── billing/              # Sub-collection: invoices
        │   └── {invoiceId}/
        │       ├── amount, currency, status, planName
        │       └── periodStart, periodEnd, date, pdfUrl
        │
        └── paymentMethods/       # Sub-collection: saved payment methods
            └── {methodId}/
                ├── type: 'card' | 'upi' | 'paypal'
                ├── last4, expiryDate, brand
                └── isDefault
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style (no logic changes)
- `refactor:` — Code refactoring
- `chore:` — Build process, dependencies

---

## 📄 License

This project is **private and proprietary**. All rights reserved.

---

<div align="center">

Built with ❤️ using React, Firebase, and TypeScript

**My Donkey OTT** — *Stream Everything*

</div>