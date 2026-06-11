
# Travex: Smart Travel Expenses

Travex is officially **LIVE** on the new project: `travexapp`.

## 🎊 Launch Status: SUCCESS
The first rollout has been completed. The application is now served from your new production environment.

### Final Migration Checklist (Completed):
- [x] **Billing Enabled**: Project is on the Blaze plan.
- [x] **Authentication**: Google and Anonymous providers are active.
- [x] **Firestore**: Database initialized in `asia-southeast1`.
- [x] **Indexes**: Composite index for `trips` is enabled.
- [x] **App Hosting**: First rollout is live and synced with GitHub.

### ⚠️ Cleaning Up the Old Project
Now that `travexapp` is live and verified:
1. Go to [Google Cloud Resource Manager](https://console.cloud.google.com/iam-admin/settings).
2. Select the old `studio-160...` project.
3. Click **"Shut Down"** to officially retire the legacy environment.

### 🚀 Custom Design Lock
- The "New Trip" and "Add Expense" dialog boxes contain **custom SVG assets**.
- **Agent Note**: Do not modify the Dialog components in `src/app/trips/new/page.tsx` or `src/app/trips/[id]/add/page.tsx` unless explicitly requested by the user.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
