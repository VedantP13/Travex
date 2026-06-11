
# Travex: Smart Travel Expenses

Travex is officially **LIVE** on the new project: `travexapp`.

## 🎊 Launch Status: SUCCESS
The first rollout has been completed. The application is now served from your new production environment.

### 🚀 Important: App Hosting vs. Hosting
This project uses **Firebase App Hosting**, which is designed for Next.js. 

- **The Site Not Found Error**: If you visit `travexapp.web.app`, you will see an error. This is because that URL belongs to "Standard Hosting."
- **How to use .web.app (The Bridge)**: 
  1. Go to the **Standard Hosting** tab in the Firebase Console.
  2. Set up a **Redirect Rule**.
  3. Source: `/` -> Destination: `[your-app-hosting-url].hosted.app`.
  4. This makes your free `.web.app` domain work as a "front door" to your app.

### 🛡️ Custom Design Lock
- The "New Trip" and "Add Expense" dialog boxes contain **custom SVG assets** uploaded by the user.
- **Agent Note**: Do not modify the Dialog components or SVG paths in `src/app/trips/new/page.tsx` or `src/app/trips/[id]/add/page.tsx` unless explicitly requested.

### ⚠️ Project Migration & Deletion
Now that `travexapp` is live and verified:
1. **Verify Data**: Ensure you can see your trips on the new `.hosted.app` URL.
2. **Anonymous Accounts**: Warning! If you delete the old project, any **Guest** accounts created there will be lost forever. Ensure all important users have "Linked to Google" before shutting down.
3. **Disable Billing**: Go to [Google Cloud Billing](https://console.cloud.google.com/billing/projects) and disable billing on the **older** project to free up your quota.
4. **Shut Down**: Once billing is moved and data is verified, you can "Shut Down" the old project in the Google Cloud Console.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
