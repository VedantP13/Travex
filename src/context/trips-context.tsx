
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
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
    const q = query(
      collection(firestore, "trips"), 
      where("participantIds", "array-contains", user.uid),
      orderBy("createdAt", "desc")
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
        setTrips(tripData);
        setLoading(false);
        setError(false);
      },
      (err) => {
        // Specifically ignore index-required errors which might happen on first run
        if (err.message.includes('index')) {
          console.warn("Firestore index required for optimized queries. Please check the console link.");
        }
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
