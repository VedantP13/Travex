"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc, serverTimestamp, getDocs, getDoc, increment } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { exportTripToExcel } from "@/lib/excel-export";

// Sub-components
import { TripHeader } from "./_components/trip-header";
import { TripFeed } from "./_components/trip-feed";
import { TripBalances } from "./_components/trip-balances";
import { ExpenseDetailDialog } from "./_components/expense-detail-dialog";
import { EditTripDialog } from "./_components/edit-trip-dialog";
import { ImagePickerDialog } from "./_components/image-picker-dialog";
import { DeleteTripDialog } from "./_components/delete-trip-dialog";
import { SecureAdventureDialog } from "./_components/secure-adventure-dialog";

export default function TripDetails() {
  const router = useRouter();
  const { id } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isSecureNudgeOpen, setIsSecureNudgeOpen] = useState(false);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<any>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);

  // Guest Security Nudge Logic: Appears every 3rd time a guest opens any trip page
  const nudgeCountedForId = useRef<string | null>(null);
  useEffect(() => {
    if (user?.isAnonymous && !loading && trip && nudgeCountedForId.current !== trip.id) {
      nudgeCountedForId.current = trip.id;
      const currentCount = parseInt(localStorage.getItem('travex_secure_nudge_total_opens') || '0', 10);
      const nextCount = currentCount + 1;
      localStorage.setItem('travex_secure_nudge_total_opens', nextCount.toString());

      if (nextCount > 0 && nextCount % 3 === 0) {
        const timer = setTimeout(() => {
          setIsSecureNudgeOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.isAnonymous, loading, trip]);

  useEffect(() => {
    if (!id || !firestore) return;

    const tripUnsubscribe = onSnapshot(doc(firestore, "trips", id as string), (snapshot) => {
      if (snapshot.exists()) {
        setTrip({ id: snapshot.id, ...snapshot.data() });
      } else {
        router.push('/');
      }
    }, async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `trips/${id}`, operation: 'get' }));
    });

    const expensesQuery = query(collection(firestore, "trips", id as string, "expenses"), orderBy("date", "asc"));
    const expensesUnsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `trips/${id}/expenses`, operation: 'list' }));
    });

    return () => {
      tripUnsubscribe();
      expensesUnsubscribe();
    };
  }, [id, firestore, router]);

  const handleResyncBalances = async () => {
    if (!id || !firestore || !trip) return;
    toast({ title: "Syncing balances...", description: "Rebuilding your ledger from history." });
    
    try {
      const expensesSnap = await getDocs(collection(firestore, "trips", id as string, "expenses"));
      const newBalances: Record<string, number> = {};
      let totalSpent = 0;

      expensesSnap.docs.forEach(snap => {
        const data = snap.data();
        const amount = parseFloat(data.amount) || 0;
        totalSpent += amount;
        
        if (data.splitType === 'unsplit') return;

        const deltas: Record<string, number> = {};
        const { splitType, selectedIndividuals, customAmounts, payerId } = data;

        if (splitType === 'custom') {
          selectedIndividuals?.forEach((pid: string) => { 
            const share = parseFloat(customAmounts?.[pid]) || 0;
            const parentId = pid.split('-')[0];
            const numSelectedInFamily = selectedIndividuals.filter((sid: string) => sid.startsWith(parentId)).length;
            // Distribute custom share to the individual
            deltas[pid] = (deltas[pid] || 0) - share;
          });
        } else if (splitType === 'equal_person') {
          const share = amount / (selectedIndividuals?.length || 1);
          selectedIndividuals?.forEach((pid: string) => { 
            deltas[pid] = (deltas[pid] || 0) - share; 
          });
        } else if (splitType === 'equal_family') {
          const familyGroups: Record<string, string[]> = {};
          selectedIndividuals?.forEach((pid: string) => {
            const fid = pid.split('-')[0];
            if (!familyGroups[fid]) familyGroups[fid] = [];
            familyGroups[fid].push(pid);
          });
          const numFamilies = Object.keys(familyGroups).length;
          if (numFamilies > 0) {
            const sharePerFamily = amount / numFamilies;
            Object.values(familyGroups).forEach(members => {
              const sharePerMember = sharePerFamily / members.length;
              members.forEach(mId => { deltas[mId] = (deltas[mId] || 0) - sharePerMember; });
            });
          }
        } else if (splitType === 'just_me') {
          deltas[payerId] = (deltas[payerId] || 0) - amount;
        }
        deltas[payerId] = (deltas[payerId] || 0) + amount;

        Object.entries(deltas).forEach(([pid, val]) => { newBalances[pid] = (newBalances[pid] || 0) + val; });
      });

      await updateDoc(doc(firestore, "trips", id as string), {
        totalSpent,
        netBalances: newBalances,
        updatedAt: serverTimestamp()
      });

      toast({ title: "Balances repaired!", description: "Standing cards are now perfectly synced." });
    } catch (e) {
      console.error(e);
      toast({ title: "Sync failed", variant: "destructive" });
    }
  };

  const handleExportToExcel = () => {
    if (!trip || !expenses || expenses.length === 0) {
      toast({ title: "No data to export", description: "Add some expenses first." });
      return;
    }
    toast({ title: "Preparing Excel...", description: "Formatting data into the standard layout." });
    exportTripToExcel(trip, expenses);
  };

  const handleDeleteTrip = async () => {
    if (!id || !firestore) return;
    setIsDeletingTrip(true);
    try {
      await deleteDoc(doc(firestore, "trips", id as string));
      toast({ title: "Trip deleted" });
      router.push('/');
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `trips/${id}`, operation: 'delete' }));
      setIsDeletingTrip(false);
    }
  };

  const handleUpdateImage = async (stagedCoverImage: string) => {
    if (!id || !firestore) return;
    setIsUpdatingImage(true);
    try {
      await updateDoc(doc(firestore, "trips", id as string), { image: stagedCoverImage, updatedAt: serverTimestamp() });
      toast({ title: "Cover updated" });
      setIsImagePickerOpen(false);
    } catch (err) {
      toast({ title: "Failed to update cover", variant: "destructive" });
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!id || !firestore || !selectedExpenseDetail) return;
    const expenseData = selectedExpenseDetail;
    const amount = parseFloat(expenseData.amount);
    const deltas: Record<string, number> = {};
    const payerId = expenseData.payerId;
    const selected = expenseData.selectedIndividuals || [];

    if (expenseData.splitType === 'custom') {
      Object.entries(expenseData.customAmounts || {}).forEach(([pid, val]: [string, any]) => { deltas[pid] = (deltas[pid] || 0) + parseFloat(val); });
    } else if (expenseData.splitType === 'equal_person') {
      const share = amount / selected.length;
      selected.forEach((pid: string) => { deltas[pid] = (deltas[pid] || 0) + share; });
    } else if (expenseData.splitType === 'equal_family') {
      const familyGroups: Record<string, string[]> = {};
      selected.forEach((pid: string) => {
        const fid = pid.split('-')[0];
        if (!familyGroups[fid]) familyGroups[fid] = [];
        familyGroups[fid].push(pid);
      });
      const numFamilies = Object.keys(familyGroups).length;
      if (numFamilies > 0) {
        const sharePerFamily = amount / numFamilies;
        Object.values(familyGroups).forEach(members => {
          const sharePerMember = sharePerFamily / members.length;
          members.forEach(mId => { deltas[mId] = (deltas[mId] || 0) + sharePerMember; });
        });
      }
    } else if (expenseData.splitType === 'just_me') {
      deltas[payerId] = (deltas[payerId] || 0) + amount;
    }
    deltas[payerId] = (deltas[payerId] || 0) - amount;

    try {
      const tripSnap = await getDoc(doc(firestore, "trips", id as string));
      const newBalances = { ...(tripSnap.data()?.netBalances || {}) };
      Object.entries(deltas).forEach(([pid, delta]) => { newBalances[pid] = (newBalances[pid] || 0) + delta; });
      await updateDoc(doc(firestore, "trips", id as string), { totalSpent: increment(-amount), netBalances: newBalances, updatedAt: serverTimestamp() });
      await deleteDoc(doc(firestore, "trips", id as string, "expenses", expenseId));
      setSelectedExpenseDetail(null);
      toast({ title: "Expense deleted" });
    } catch (e) {
      toast({ variant: "destructive", title: "Could not delete expense" });
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !firestore) return;
    try {
      await updateDoc(doc(firestore, "trips", id as string), { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: `Trip marked as ${newStatus}` });
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `trips/${id}`, operation: 'update', requestResourceData: { status: newStatus } }));
    }
  };

  const groupedStandings = useMemo(() => {
    if (!trip?.participants || !trip?.netBalances) return [];
    return trip.participants.map((p: any) => {
      const isMe = p.isUser && p.userId === user?.uid;
      const headName = p.name.replace(" (You)", "");
      let total = trip.netBalances[p.id] || 0;
      const breakdown = [{ name: headName, balance: trip.netBalances[p.id] || 0 }];
      p.familyMembers?.forEach((fm: string) => {
        const val = trip.netBalances[`${p.id}-${fm}`] || 0;
        total += val;
        breakdown.push({ name: fm, balance: val });
      });
      return { id: p.id, name: headName, isMe, avatar: p.avatar, netTotal: total, breakdown, familyCount: breakdown.length };
    }).sort((a: any, b: any) => b.netTotal - a.netTotal);
  }, [trip, user?.uid]);

  const suggestedPayments = useMemo(() => {
    const debtors = groupedStandings.filter(s => s.netTotal < -0.01).map(s => ({ name: s.name, avatar: s.avatar, balance: Math.abs(s.netTotal) }));
    const creditors = groupedStandings.filter(s => s.netTotal > 0.01).map(s => ({ name: s.name, avatar: s.avatar, balance: s.netTotal }));
    const transactions: any[] = [];
    let dIdx = 0, cIdx = 0;
    const dList = JSON.parse(JSON.stringify(debtors)), cList = JSON.parse(JSON.stringify(creditors));
    while (dIdx < dList.length && cIdx < cList.length) {
      const d = dList[dIdx], c = cList[cIdx], amount = Math.min(d.balance, c.balance);
      transactions.push({ from: d.name, fromAvatar: d.avatar, to: c.name, toAvatar: c.avatar, amount });
      d.balance -= amount; c.balance -= amount;
      if (d.balance < 0.01) dIdx++;
      if (c.balance < 0.01) cIdx++;
    }
    return transactions;
  }, [groupedStandings]);

  const isPastDue = useMemo(() => {
    if (!trip || trip.status !== 'Active' || !trip.endDate) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(trip.endDate) < today;
  }, [trip]);

  if (loading && !trip) {
    return <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const unsplitExpenses = expenses.filter(e => e.splitType === 'unsplit');
  const finalizedExpenses = expenses.filter(e => e.splitType !== 'unsplit');
  const isSettled = trip?.status === 'Settled';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col pb-32">
      <TripHeader 
        trip={trip} 
        onBack={() => router.push('/')} 
        onEdit={() => setIsEditDialogOpen(true)} 
        onDelete={() => setIsDeleteDialogOpen(true)} 
        onChangeCover={() => setIsImagePickerOpen(true)} 
        onResync={handleResyncBalances}
        onDownloadExcel={handleExportToExcel}
      />

      <div className="px-safe-pad pt-8 flex-1">
        {isPastDue && !isSettled && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <Alert className="bg-primary/5 border-primary/20 rounded-2xl flex items-center justify-between py-4 shadow-sm">
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">Trip ended on {trip.date?.split('-')[1] || trip.date}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Mark as completed?</p>
                </div>
              </div>
              <Button size="sm" className="rounded-xl bg-primary text-white font-bold h-8 text-[10px] px-3" onClick={() => handleUpdateStatus('Completed')}>Mark Done</Button>
            </Alert>
          </div>
        )}

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white p-1.5 rounded-2xl shadow-inner border border-muted/20">
            <TabsTrigger value="feed" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-sm transition-all">Trip feed</TabsTrigger>
            <TabsTrigger value="balances" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-sm transition-all">Balances</TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-6">
            <TripFeed 
              unsplitExpenses={unsplitExpenses} 
              finalizedExpenses={finalizedExpenses} 
              loading={loading} 
              onSelectExpense={setSelectedExpenseDetail}
              onSplitNow={(expenseId) => router.push(`/trips/${id}/expenses/${expenseId}/split`)}
              isSettled={isSettled}
            />
          </TabsContent>

          <TabsContent value="balances" className="mt-6">
            <TripBalances 
              groupedStandings={groupedStandings} 
              suggestedPayments={suggestedPayments} 
              expenses={expenses}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {!isSettled && (
        <div className="fixed bottom-10 right-8 z-30">
          <Button size="lg" className="rounded-full h-16 w-16 shadow-2xl shadow-accent/40 bg-accent hover:bg-accent/90 p-0 transition-transform hover:scale-110 active:scale-95 group" onClick={() => router.push(`/trips/${id}/add`)}>
            <Plus className="h-10 w-10 transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} />
          </Button>
        </div>
      )}

      <ImagePickerDialog 
        isOpen={isImagePickerOpen} 
        onOpenChange={setIsImagePickerOpen} 
        currentImage={trip?.image} 
        onSave={handleUpdateImage} 
        isUploading={isUpdatingImage} 
      />

      <ExpenseDetailDialog 
        expense={selectedExpenseDetail} 
        trip={trip} 
        onClose={() => setSelectedExpenseDetail(null)} 
        onDelete={handleDeleteExpense} 
        onEdit={(expenseId) => router.push(`/trips/${id}/expenses/${expenseId}/edit`)}
        onFinalizeSplit={(expenseId) => router.push(`/trips/${id}/expenses/${expenseId}/split`)} 
      />

      <EditTripDialog 
        isOpen={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        trip={trip} 
        user={user} 
      />

      <DeleteTripDialog 
        isOpen={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        tripName={trip?.name} 
        onDelete={handleDeleteTrip} 
        isDeleting={isDeletingTrip} 
      />

      <SecureAdventureDialog 
        isOpen={isSecureNudgeOpen} 
        onOpenChange={setIsSecureNudgeOpen} 
      />
    </div>
  );
}
