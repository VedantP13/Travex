
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";

interface TripsContextType {
  trips: any[];
  loading: boolean;
  error: boolean;
}

const TripsContext = createContext<TripsContextType | undefined>(undefined);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.uid) {
      if (!user && !loading) setLoading(false);
      return;
    }
    
    // Query ONLY trips where the current user is a participant
    // Note: We avoid orderBy here to prevent the need for a manual composite index
    const q = query(
      collection(firestore, "trips"), 
      where("participantIds", "array-contains", user.uid)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tripData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        });

        // Client-side sorting by updatedAt (descending)
        // This ensures recent activity stays at the top without requiring Firestore composite indexes
        tripData.sort((a, b) => {
          const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt || 0);
          const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt || 0);
          return timeB - timeA;
        });

        setTrips(tripData);
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error("Firestore trips sync failed:", err);
        setError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user?.uid, loading]);

  return (
    <TripsContext.Provider value={{ trips, loading, error }}>
      {children}
    </TripsContext.Provider>
  );
}

export function useTrips() {
  const context = useContext(TripsContext);
  if (context === undefined) {
    throw new Error("useTrips must be used within a TripsProvider");
  }
  return context;
}
