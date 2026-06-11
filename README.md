# Travex: Smart Travel Expenses

Travex is a modern web application designed for intelligent expense capture and splitting for travelers. Built with Next.js, React, and Firebase.

## Key Features
- **Intelligent Categorization:** AI-powered expense tagging.
- **Hierarchical Splitting:** Split by individual or family group.
- **Real-time Sync:** Powered by Firestore.
- **Secure Auth:** Google and Guest login options.

## Project Migration (New Project: travexapp)

We have successfully migrated the application context to the new Firebase project: `travexapp`.

### Final Checklist for your New Project:

1.  **Enable Billing (Blaze Plan)**:
    *   Go to the [Google Cloud Billing Projects page](https://console.cloud.google.com/billing/projects).
    *   Find **travexapp** in the list.
    *   Click the three dots (Actions) and select **Change billing**.
    *   Select **My Billing Account** and confirm.
    *   **Quota Error?**: If you see "Unable to enable billing", you must first **Disable Billing** on your old project in this same list to free up a slot.

2.  **Authentication Setup**:
    *   Go to **Firebase Console > Authentication**.
    *   Click **Get started**.
    *   In the **Sign-in method** tab, enable **Google** and **Anonymous** providers.

3.  **Firestore Setup**:
    *   Go to **Firestore Database** > **Create database**.
    *   Select **Location**: `asia-southeast1` (Singapore).
    *   Select **Production Mode**. Security rules are managed by the AI agent.

4.  **Authorized Domains**:
    *   Go to **Authentication > Settings > Authorized domains**.
    *   Ensure `travexapp.web.app` and `travexapp.firebaseapp.com` are listed.
    *   **CRITICAL for Development**: Add your Firebase Studio domain: `cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev`.

5.  **App Hosting (New Deployment)**:
    *   Go to **App Hosting** in the `travexapp` console.
    *   Create a **new backend** linked to your GitHub repo.
    *   Select **Finish and deploy** to start the first build.
    *   In the backend settings, add these **Environment Variables**:
        * `NEXT_PUBLIC_FIREBASE_API_KEY`
        * `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        * `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (travexapp)
        * `NEXT_PUBLIC_FIREBASE_APP_ID`

6.  **Old Project Cleanup**:
    *   Once the new URL is live and tested, delete the old project in the [Google Cloud Console](https://console.cloud.google.com/iam-admin/settings).

### Troubleshooting Billing Errors

**Error: "Could not update billing info"**
*   **Permissions**: Ensure you are a "Billing Account User" on the selected billing account in the Google Cloud Console.
*   **Incognito Mode**: Try the process in an incognito window to avoid session conflicts between multiple Google accounts.

**Error: "Unable to enable billing" (Quota Limit)**
*   **Release Slot**: You must **Disable Billing** on an older project before you can enable it on a new one if you have hit your project limit.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
