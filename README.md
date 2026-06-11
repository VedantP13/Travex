# Travex: Smart Travel Expenses

Travex is a modern web application designed for intelligent expense capture and splitting for travelers. Built with Next.js, React, and Firebase.

## Key Features
- **Intelligent Categorization:** AI-powered expense tagging.
- **Hierarchical Splitting:** Split by individual or family group.
- **Real-time Sync:** Powered by Firestore.
- **Secure Auth:** Google and Guest login options.

## Project Migration (Active Project: travexapp)

The application has been migrated to the project: `travexapp`.

### Final Checklist for your New Project:

1.  **Enable Billing (Blaze Plan)**:
    *   Go to the [Google Cloud Billing Projects page](https://console.cloud.google.com/billing/projects).
    *   Disable billing on the old project if you hit a quota limit.
    *   Enable billing for **travexapp**.

2.  **Authentication Setup**:
    *   Go to **Firebase Console > Authentication**.
    *   Enable **Google** and **Anonymous** providers.

3.  **Firestore Setup**:
    *   Go to **Firestore Database** > **Create database**.
    *   Select **Location**: `asia-southeast1` (Singapore).
    *   Select **Production Mode**. Security rules are now managed by the `firestore.rules` file in this repository.

4.  **Authorized Domains**:
    *   Go to **Authentication > Settings > Authorized domains**.
    *   Add `travexapp.web.app`.
    *   Add the Firebase Studio domain: `cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev`.

5.  **App Hosting Deployment**:
    *   Create a **new backend** in the `travexapp` console.
    *   Set **Environment Variables**:
        * `NEXT_PUBLIC_FIREBASE_API_KEY`
        * `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (travexapp.firebaseapp.com)
        * `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (travexapp)
        * `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        * `NEXT_PUBLIC_FIREBASE_APP_ID`

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
