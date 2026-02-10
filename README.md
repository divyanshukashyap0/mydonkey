# 🐴 My Donkey OTT Platform

A premium, Netflix-style OTT (Over-The-Top) streaming platform built with **React, Vite, TypeScript, and Firebase**. This project features a modern, responsive UI, user authentication, subscription management, and a comprehensive Admin Dashboard for content management.

## 🚀 Features

-   **User Experience**:
    -   🎬 **Cinematic UI**: immersive hero banners, content rails, and smooth transitions.
    -   🔐 **Authentication**: Secure login/signup via Firebase Auth.
    -   👤 **Multi-Profile Support**: Create and manage multiple profiles per account (including Kids mode).
    -   📝 **My List**: Save content to watch later.
    -   🔍 **Search**: Real-time search by title, genre, or cast.
    -   📱 **Responsive Design**: Optimized for Desktop, Tablet, and Mobile.
    -   📺 **Video Player**: Custom video player with quality control and playback features.

-   **Management (Admin Dashboard)**:
    -   📊 **Dashboard**: Overview of users, subscriptions, and revenue.
    -   🎬 **Content Management**: Add, edit, and delete Movies, TV Shows, and Documentaries.
    -   🏷️ **Plans & Pricing**: Manage subscription plans and features.
    -   👥 **User Management**: View and manage user accounts and roles.
    -   🎨 **Section Management**: Customize homepage sections (Trending, Originals, etc.).

## 🛠️ Tech Stack

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS, Lucide React (Icons)
-   **Backend / BaaS**: Firebase (Authentication, Firestore, Storage, Hosting)
-   **State Management**: React Context API
-   **Deployment**: Vercel / Firebase Hosting

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   A **Firebase Project** (create one at [console.firebase.google.com](https://console.firebase.google.com/))

## ⚙️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/my-donkey-ott.git
    cd my-donkey-ott
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

## 🔐 Environment Configuration

### Frontend (.env)
Create a `.env` file in the root directory and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend / Seeding (.env.local or machine env)
For running admin scripts (like database seeding), you need a Service Account.
1.  Go to Firebase Console > Project Settings > Service accounts.
2.  Generate a new private key.
3.  Set the following variables (or create a separate `.env` for scripts if supported, otherwise set in your shell):

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## 🗄️ Database Seeding

To populate your Firestore database with initial data (Plans, Demo Content, Sections, Admin User), run the seed script:

```bash
npm run seed
```

> **Note**: This will create a default admin user:
> -   **Email**: `admin@mydonkey.in`
> -   **Password**: *You must ensure this user is created in Firebase Auth manually or via the app first, then the seed script assigns the 'admin' role in Firestore.*

## 🏃 Running Locally

Start the development server:

```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🚀 Deployment

### Option 1: Vercel (Recommended)
1.  Install Vercel CLI: `npm method i -g vercel`
2.  Run `vercel` to deploy.
3.  Add the Environment Variables in the Vercel Dashboard project settings.

### Option 2: Firebase Hosting
1.  Login to Firebase: `firebase login`
2.  Initialize Hosting: `firebase init hosting`
3.  Build the project: `npm run build`
4.  Deploy: `firebase deploy --only hosting`

## 🛡️ Management & Admin Access

To access the Admin Dashboard:
1.  Log in with an account that has the `admin` role (e.g., the seeded `admin@mydonkey.in`).
2.  Navigate to the Admin section (usually accessible via the Profile menu or explicit route if configured).
3.  **Features**:
    -   **Add Content**: Upload thumbnails, set titles, descriptions, and video URLs (YouTube/Drive).
    -   **Manage Plans**:Update pricing and features for Basic, Standard, and Premium tiers.
    -   **Users**: Monitor active subscribers and trial users.

## 📄 License

This project is licensed under the MIT License.