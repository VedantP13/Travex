
# Travex: Smart Travel Expenses

Travex is officially **LIVE** on the new project: `travexapp`.

## 🎊 Launch Status: SUCCESS
The first rollout has been completed. The application is now served from your new production environment.

### 🛡️ Custom Design & Logic Lock
- The "New Trip" and "Add Expense" pages contain **custom SVG assets** and high-fidelity dialog styling.
- **Agent Note**: Do not modify the Dialog components or SVG paths.
- **Logic Rule**: The "Secure your adventure" guest prompt is strictly scoped to the **New Trip** flow (`src/app/trips/new/page.tsx`) and is intentionally omitted from the **Add Expense** flow to ensure a seamless experience for active explorers.

### 🚀 Important: App Hosting vs. Hosting
This project uses **Firebase App Hosting**, which is designed for Next.js. 

- **The Site Not Found Error**: If you visit `travexapp.web.app`, you will see an error. This is because that URL belongs to "Standard Hosting."
- **The Solution**: Use the `.hosted.app` URL provided in the **App Hosting** tab of your Firebase Console.

### ⚠️ Project Migration
Now that `travexapp` is live:
1. **Verify Data**: Ensure you can see your trips on the new `.hosted.app` URL.
2. **Anonymous Accounts**: Warning! If you delete the old project, guest accounts created there will be lost.
3. **Shut Down**: Once verified, disable billing on the older project to free up quota.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Genkit (Google Gemini)
