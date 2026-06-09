
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useFirestore } from "@/firebase";

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

  useEffect(() => {
    if (!firestore) return;
    
    const q = query(collection(firestore, "trips"), orderBy("createdAt", "desc"));
    
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
  }, [firestore]);

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
