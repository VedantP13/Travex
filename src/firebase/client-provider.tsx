
'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { getFirebaseApp, getFirestoreInstance, getAuthInstance } from './config';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo(() => {
    const app = getFirebaseApp();
    const firestore = getFirestoreInstance(app);
    const auth = getAuthInstance(app);
    return { app, firestore, auth };
  }, []);

  return (
    <FirebaseProvider
      app={services.app}
      firestore={services.firestore}
      auth={services.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
