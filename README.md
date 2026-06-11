# Travex: Smart Travel Expenses

Travex is a modern web application designed for intelligent expense capture and splitting for travelers. Built with Next.js, React, and Firebase.

## Key Features
- **Intelligent Categorization:** AI-powered expense tagging.
- **Hierarchical Splitting:** Split by individual or family group.
- **Real-time Sync:** Powered by Firestore.
- **Secure Auth:** Google and Guest login options.

## Project Migration (New Project: travexapp)

We have successfully migrated the application context to the new Firebase project: `travexapp`.

### Final Steps for Your New Project:

1.  **Authentication Setup**:
    *   Go to **Firebase Console > Authentication**.
    *   Click **Get started**.
    *   In the **Sign-in method** tab, enable **Google** and **Anonymous** providers.
2.  **Firestore Setup**:
    *   Go to **Firestore Database** > **Create database**.
    *   Select **Location**: `asia-southeast1` (Singapore).
    *   Select **Production Mode**. The security rules will be automatically managed by the AI agent.
3.  **Authorized Domains**:
    *   Go to **Authentication > Settings > Authorized domains**.
    *   Ensure `travexapp.web.app` and `travexapp.firebaseapp.com` are in the list.
    *   **CRITICAL for Development**: Also add your Firebase Studio domain: `cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev`.
4.  **App Hosting Environment Variables**:
    *   Go to **App Hosting > Settings**.
    *   Ensure `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` match your **new** project's settings.
5.  **Old Project**:
    *   You can now safely delete the old project from the [Google Cloud Console](https://console.cloud.google.com/) once you have verified the new deployment.

## Deployment Guide (Firebase App Hosting)

To complete the setup for Next.js SSR support:

1. **Select Region:** `asia-southeast1` (Singapore).
2. **Backend ID:** `travex-prod`.
3. **Deployment Settings:**
   - **Live branch:** `main`
   - **App root directory:** `/`
   - **Automatic rollouts:** Enabled
4. **Final Step:** Select **"Finish and deploy"** to initiate the build.

## Custom Domains

To use a custom name like `yourname.app`:
1. Go to **Firebase Console > App Hosting**.
2. Select your **travex-prod** backend.
3. Click the **Settings** tab.
4. Click **Add custom domain** and follow the DNS verification steps.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
