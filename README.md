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

To complete the setup shown in your console:

1. **Select Region:** Continue with `asia-southeast1` (Singapore) as selected in your screenshot.
2. **Connect GitHub:** Link your repository and select the `main` branch.
3. **Environment Variables:** In the App Hosting dashboard, add the following secrets/variables from your Firebase Project Settings:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. **Authorized Domains:** Once deployed, ensure your App Hosting URL is added to **Firebase Console > Authentication > Settings > Authorized domains**.
