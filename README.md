# Travex: Smart Travel Expenses

Travex is a modern web application designed for intelligent expense capture and splitting for travelers. Built with Next.js, React, and Firebase.

## Key Features
- **Intelligent Categorization:** AI-powered expense tagging.
- **Hierarchical Splitting:** Split by individual or family group.
- **Real-time Sync:** Powered by Firestore.
- **Secure Auth:** Google and Guest login options.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)

## Deployment Guide (Firebase App Hosting)

To complete the setup:

1. **Select Region:** `asia-southeast1` (Singapore).
2. **Backend ID:** `travex-prod`.
3. **Deployment Settings:**
   - **Live branch:** `main`
   - **App root directory:** `/`
   - **Automatic rollouts:** Enabled
4. **Environment Variables:** Add these from your Firebase Project Settings:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. **Final Step:** Select **"Finish and deploy"** to initiate the build.
6. **Authorized Domains:** Once the deployment is successful, copy your unique App Hosting URL (e.g., `travex-prod...hosted.app`) and add it to **Firebase Console > Authentication > Settings > Authorized domains** to enable Google Sign-In.

## Custom Domains (Improving your URL)

To use a custom name like `travex.app` instead of the generated URL:
1. Go to **Firebase Console > App Hosting**.
2. Select your **travex-prod** backend.
3. Click the **Settings** tab.
4. Click **Add custom domain** and follow the DNS verification steps.
5. Once verified, remember to add your new domain to the **Authorized domains** list in the **Authentication** settings.
