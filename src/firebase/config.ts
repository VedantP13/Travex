
'use client';

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

/**
 * Firebase configuration object.
 * When deploying to App Hosting, ensure these NEXT_PUBLIC_ variables 
 * are set in your App Hosting dashboard secrets or environment variables.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton instances to avoid re-initialization errors
let appInstance: FirebaseApp | undefined;
let firestoreInstance: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirestoreInstance(app?: FirebaseApp): Firestore {
  const currentApp = app || getFirebaseApp();
  
  if (firestoreInstance) return firestoreInstance;

  // Initialize Firestore with local persistence enabled.
  // This allows the app to store data locally in IndexedDB, enabling
  // full functionality (reading and adding expenses) while traveling offline.
  try {
    firestoreInstance = initializeFirestore(currentApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    // Fallback to standard initialization if already initialized
    firestoreInstance = getFirestore(currentApp);
  }

  return firestoreInstance;
}

export function getAuthInstance(app?: FirebaseApp): Auth {
  return getAuth(app || getFirebaseApp());
}
