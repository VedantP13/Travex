
# Travex: Smart Travel Expenses

Travex is officially **LIVE** on the new project: `travexapp`.

## 🎊 Launch Status: SUCCESS
The first rollout has been completed. The application is now served from your new production environment.

### 🚀 Important: App Hosting vs. Hosting
This project uses **Firebase App Hosting**, which is designed for Next.js. 

- **The Site Not Found Error**: If you visit `travexapp.web.app`, you will see an error. This is because that URL belongs to "Standard Hosting."
- **Correct URL**: To see your app, go to the **App Hosting** tab in the Firebase Console and click the link ending in **`.hosted.app`**.
- **Using .web.app**: Currently, Firebase does not automatically link the `.web.app` domain to App Hosting. To use a professional domain, it is recommended to add a **Custom Domain** (like your-name.com) in the App Hosting Settings tab.

### 🛡️ Custom Design Lock
- The "New Trip" and "Add Expense" dialog boxes contain **custom SVG assets** uploaded by the user.
- **Agent Note**: Do not modify the Dialog components or SVG paths in `src/app/trips/new/page.tsx` or `src/app/trips/[id]/add/page.tsx` unless explicitly requested.

### ⚠️ Project Migration & Deletion
Now that `travexapp` is live and verified:
1. **Verify Data**: Ensure you can see your trips on the new `.hosted.app` URL.
2. **Disable Billing**: Go to [Google Cloud Billing](https://console.cloud.google.com/billing/projects) and disable billing on the **older** project to free up your quota.
3. **Shut Down**: Once billing is moved and data is verified, you can "Shut Down" the old project in the Google Cloud Console.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
