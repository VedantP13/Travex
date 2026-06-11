
# Travex: Smart Travel Expenses

Travex is a modern web application designed for intelligent expense capture and splitting for travelers. Built with Next.js, React, and Firebase.

## Project Migration (Target: travexapp)

The application has been successfully migrated to the project: `travexapp`.

### Final Checklist for your New Project:

1.  **Enable Billing (Blaze Plan)**:
    *   Go to the [Google Cloud Billing Projects page](https://console.cloud.google.com/billing/projects).
    *   Disable billing on the old project if you hit a quota limit.
    *   Enable billing for **travexapp**.

2.  **Authentication Setup**:
    *   Go to **Firebase Console > Authentication**.
    *   Enable **Google** and **Anonymous** providers.
    *   **Authorized Domains**: Add `travexapp.web.app` and the Firebase Studio domain.

3.  **Firestore Setup**:
    *   Go to **Firestore Database** > **Create database**.
    *   Select **Location**: `asia-southeast1` (Singapore).
    *   Select **Production Mode**. Security rules are managed by the `firestore.rules` file.

4.  **Firestore Indexes (Required)**:
    *   The dashboard uses a composite index for `trips` (`participantIds` [Array] + `createdAt` [Descending]).
    *   Click the link in your browser console error to auto-create this index.

### ⚠️ Deleting the Old Project
Before you shut down the old `studio-160...` project:
*   Ensure all active trips have been recreated or finished.
*   Verify that `travexapp.web.app` is fully functional.
*   **Note**: Deletion is permanent and removes all legacy Firestore data and Auth users.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
