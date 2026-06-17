
'use client';

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft,
  X,
  Loader2,
  Calendar as CalendarIcon,
  CreditCard,
  Tag,
  Users,
  User,
  Home,
  MapPin,
  AlignLeft,
  Calculator,
  Pin,
  Utensils,
  Car,
  ShoppingBag,
  Camera,
  Plane,
  Box,
  Settings,
  Plus,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatedCompass } from "@/components/animated-compass";
import { cn } from "@/lib/utils";

export default function EditExpensePage() {
  const router = useRouter();
  const { id: tripId, expenseId } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [expense, setExpense] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    payerId: "",
    payerName: "",
    splitType: "equal_person",
    selectedIndividuals: [] as string[],
    customAmounts: {} as Record<string, string>,
    isItemized: false,
    date: "",
    paymentType: "",
    category: "Other"
  });

  useEffect(() => {
    if (!tripId || !expenseId || !firestore) return;

    // Fetch Trip
    const tripUnsub = onSnapshot(doc(firestore, "trips", tripId as string), (snap) => {
      if (snap.exists()) setTrip({ id: snap.id, ...snap.data() });
    });

    // Fetch Expense
    const expenseUnsub = onSnapshot(doc(firestore, "trips", tripId as string, "expenses", expenseId as string), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExpense({ id: snap.id, ...data });
        
        // Initialize form data from existing record
        setFormData({
          description: data.description || "",
          amount: data.amount?.toString() || "",
          payerId: data.payerId || "",
          payerName: data.payerName || "",
          splitType: data.splitType || "equal_person",
          selectedIndividuals: data.selectedIndividuals || [],
          customAmounts: data.customAmounts || {},
          isItemized: data.isItemized || false,
          date: data.date || "",
          paymentType: data.paymentType || "",
          category: data.category || "Other"
        });
        
        setLoading(false);
      } else {
        router.push(`/trips/${tripId}`);
      }
    });

    return () => {
      tripUnsub();
      expenseUnsub();
    };
  }, [tripId, expenseId, firestore, router]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AnimatedCompass className="h-12 w-12 text-primary" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Retrieving expense...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold truncate px-4">Edit {expense?.description || "Expense"}</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push(`/trips/${tripId}`)}>
          <X className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 px-safe-pad py-8 overflow-y-auto pb-32">
        <div className="space-y-6">
          <div className="p-10 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in-95 duration-500">
             <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings className="h-8 w-8 animate-spin-slow" />
             </div>
             <div className="space-y-1">
                <h2 className="text-lg font-bold">Phase 1 Complete</h2>
                <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                  Route connected! We've successfully fetched <strong>{expense.description}</strong>. 
                  Ready for Phase 2: The Balance Reversal Logic.
                </p>
             </div>
          </div>
        </div>
      </main>
      
      <footer className="p-safe-pad border-t bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20 shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
         <Button className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20" onClick={() => router.back()}>
            Back to trip
         </Button>
      </footer>
    </div>
  );
}
