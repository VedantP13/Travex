'use client';

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager 
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

/**
 * Firebase configuration object.
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
  
  // Guard against missing config during SSR or initial setup
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing. Check your environment variables.");
  }

  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirestoreInstance(app?: FirebaseApp): Firestore {
  const currentApp = app || getFirebaseApp();
  
  if (firestoreInstance) return firestoreInstance;

  // Persistence only works in the browser (client-side)
  if (typeof window !== 'undefined') {
    try {
      firestoreInstance = initializeFirestore(currentApp, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager()
        })
      });
    } catch (e) {
      firestoreInstance = getFirestore(currentApp);
    }
  } else {
    // Standard initialization for Server-Side Rendering pass
    firestoreInstance = getFirestore(currentApp);
  }

  return firestoreInstance;
}

export function getAuthInstance(app?: FirebaseApp): Auth {
  return getAuth(app || getFirebaseApp());
}
