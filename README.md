
# Travex: Smart Travel Expenses

Travex is officially **LIVE** on the new project: `travexapp`.

## 🎊 Launch Status: SUCCESS
The first rollout has been completed. The application is now served from your new production environment.

### 🛡️ Recent Updates & Fixes
- **Smart Friend Search**: Optimized "Search as you type" with prefix matching and Trip Companion prioritization.
- **Guest Personas**: Unique travel-inspired identities (e.g., "Nomadic Voyager") assigned to guest accounts.
- **Improved UI**: Enhanced visual hierarchy for expenses and responsive dialogs for cover image changes.
- **Friend Notifications**: Visual indicator for pending friend requests.

### 🚀 Git Sync Instructions
If you encounter a `fatal: Need to specify how to reconcile divergent branches` error when pulling, it means your local changes and the remote branch have diverged. 

To resolve this, I've added a helper script. Run this in your terminal:
```bash
npm run sync
```
This will configure Git to use the standard merge strategy and pull the latest changes from `main`.

### 🛡️ Custom Design & Logic Lock
- The "New Trip" and "Add Expense" pages contain **custom SVG assets** and high-fidelity dialog styling.
- **Agent Note**: Do not modify the Dialog components or SVG paths.
- **Logic Rule**: The "Secure your adventure" guest prompt is strictly scoped to the **New Trip** flow (`src/app/trips/new/page.tsx`).

### 🚀 Firebase Hosting
- **The Solution**: Use the `.hosted.app` URL provided in the **App Hosting** tab of your Firebase Console.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
