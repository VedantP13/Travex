
'use client';

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft,
  X,
  Loader2,
  Settings,
  ShieldAlert,
  Save,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, increment } from "firebase/firestore";
import { AnimatedCompass } from "@/components/animated-compass";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

export default function EditExpensePage() {
  const router = useRouter();
  const { id: tripId, expenseId } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
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

    const tripUnsub = onSnapshot(doc(firestore, "trips", tripId as string), (snap) => {
      if (snap.exists()) setTrip({ id: snap.id, ...snap.data() });
    });

    const expenseUnsub = onSnapshot(doc(firestore, "trips", tripId as string, "expenses", expenseId as string), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExpense({ id: snap.id, ...data });
        
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

  // Permission Logic
  const canEdit = useMemo(() => {
    if (loading || !expense || !user) return true; // Show while loading
    return expense.addedBy === user.uid;
  }, [expense, user, loading]);

  const calculateImpact = (data: any, tripParticipants: any[]) => {
    const deltas: Record<string, number> = {};
    const amount = parseFloat(data.amount);
    if (isNaN(amount)) return deltas;

    const { splitType, selectedIndividuals, customAmounts, payerId } = data;

    if (splitType === 'custom') {
      selectedIndividuals.forEach((id: string) => {
        const share = parseFloat(customAmounts[id]) || 0;
        deltas[id] = (deltas[id] || 0) - share;
      });
    } else if (splitType === 'equal_person') {
      const share = amount / selectedIndividuals.length;
      selectedIndividuals.forEach((id: string) => {
        deltas[id] = (deltas[id] || 0) - share;
      });
    } else if (splitType === 'equal_family') {
      const familyIds = Array.from(new Set(selectedIndividuals.map((id: string) => id.split('-')[0])));
      const sharePerFamily = amount / familyIds.length;
      familyIds.forEach((fid: string) => {
        deltas[fid] = (deltas[fid] || 0) - sharePerFamily;
      });
    } else if (splitType === 'just_me') {
      deltas[payerId] = (deltas[payerId] || 0) - amount;
    }

    // Add the credit for the payer
    deltas[payerId] = (deltas[payerId] || 0) + amount;
    return deltas;
  };

  const handleUpdateExpense = async (newFormState: any) => {
    if (!tripId || !expenseId || !firestore || !expense) return;
    
    setIsUpdating(true);
    const expenseRef = doc(firestore, "trips", tripId as string, "expenses", expenseId as string);
    const tripRef = doc(firestore, "trips", tripId as string);

    try {
      const tripSnap = await getDoc(tripRef);
      const currentBalances = tripSnap.data()?.netBalances || {};
      
      // 1. Calculate impact of the OLD expense (to be reversed)
      const oldImpact = calculateImpact(expense, trip.participants);
      
      // 2. Calculate impact of the NEW expense
      const newImpact = calculateImpact(newFormState, trip.participants);

      // 3. Apply Reversal & New Impact to balances
      const updatedBalances = { ...currentBalances };
      
      // Reverse old
      Object.entries(oldImpact).forEach(([id, impact]) => {
        updatedBalances[id] = (updatedBalances[id] || 0) - impact;
      });
      
      // Apply new
      Object.entries(newImpact).forEach(([id, impact]) => {
        updatedBalances[id] = (updatedBalances[id] || 0) + impact;
      });

      const amountDiff = parseFloat(newFormState.amount) - expense.amount;

      // Update Firestore
      await updateDoc(expenseRef, {
        ...newFormState,
        amount: parseFloat(newFormState.amount),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(tripRef, {
        totalSpent: increment(amountDiff),
        netBalances: updatedBalances,
        updatedAt: serverTimestamp()
      });

      toast({ title: "Expense updated", description: "Balances have been recalculated." });
      router.push(`/trips/${tripId}`);
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: expenseRef.path,
        operation: 'update',
        requestResourceData: newFormState
      }));
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AnimatedCompass className="h-12 w-12 text-primary" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Retrieving expense...</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
           <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only the person who added this expense (<span className="font-bold text-foreground">{expense.payerName}</span>) can make changes to it.
          </p>
        </div>
        <Button className="w-full h-12 rounded-2xl font-bold" variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold truncate px-4">Edit {expense?.description}</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push(`/trips/${tripId}`)}>
          <X className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 px-safe-pad py-8 overflow-y-auto pb-32">
        <div className="space-y-6">
          <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center gap-4">
             <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings className="h-7 w-7 animate-spin-slow" />
             </div>
             <div className="space-y-1">
                <h2 className="text-lg font-bold">Phase 2 Logic Enabled</h2>
                <p className="text-[11px] text-muted-foreground px-6 leading-relaxed">
                  The mathematical engine is ready to reverse <strong>₹{expense.amount}</strong> and re-apply updated debts.
                </p>
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-muted/20 space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Audit</p>
                <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">Edit Mode</Badge>
             </div>
             <p className="text-xs text-muted-foreground leading-relaxed italic">
               Note: Any changes will instantly update everyone's net standing in the "Balances" tab.
             </p>
          </div>
        </div>
      </main>
      
      <footer className="p-safe-pad border-t bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20 shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
         <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => router.back()}>
               Cancel
            </Button>
            <Button 
              className="flex-[2] h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 gap-2" 
              onClick={() => handleUpdateExpense(formData)}
              disabled={isUpdating}
            >
               {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4" /> Save Update</>}
            </Button>
         </div>
      </footer>
    </div>
  );
}
