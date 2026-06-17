
'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Calendar as CalendarIcon,
  CreditCard,
  AlignLeft,
  Plus,
  Minus,
  Calculator,
  Utensils,
  Car,
  ShoppingBag,
  Home,
  Plane,
  Camera,
  Box,
  User,
  Users,
  Save,
  Settings,
  Smartphone,
  Banknote,
  Globe,
  Trash2,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, increment } from "firebase/firestore";
import { AnimatedCompass } from "@/components/animated-compass";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FAMILY_SCHEMES = [
  { border: "border-primary", bg: "bg-primary/5", text: "text-primary", badge: "bg-primary/10 text-primary", darkBg: "bg-primary/10", focus: "focus-visible:ring-primary" },
  { border: "border-accent", bg: "bg-accent/5", text: "text-accent", badge: "bg-accent/10 text-accent", darkBg: "bg-accent/10", focus: "focus-visible:ring-accent" },
  { border: "border-secondary", bg: "bg-secondary/5", text: "text-secondary", badge: "bg-secondary/10 text-secondary", darkBg: "bg-secondary/10", focus: "focus-visible:ring-secondary" },
  { border: "border-blue-500", bg: "bg-blue-500/5", text: "text-blue-500", badge: "bg-blue-500/10 text-blue-500", darkBg: "bg-blue-500/10", focus: "focus-visible:ring-blue-500" },
  { border: "border-green-500", bg: "bg-green-500/5", text: "text-green-500", badge: "bg-green-500/10 text-green-500", darkBg: "bg-green-500/10", focus: "focus-visible:ring-green-500" },
];

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: Utensils },
  { name: 'Transport', icon: Car },
  { name: 'Shopping', icon: ShoppingBag },
  { name: 'Stay', icon: Home },
  { name: 'Flights', icon: Plane },
  { name: 'Sightseeing', icon: Camera },
  { name: 'Other', icon: Box },
];

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'Cash', label: 'Cash', icon: Banknote },
  { id: 'Card', label: 'Card', icon: CreditCard },
  { id: 'Net Banking', label: 'Net Banking', icon: Globe },
];

export default function EditExpensePage() {
  const router = useRouter();
  const { id: tripId, expenseId } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [trip, setTrip] = useState<any>(null);
  const [expense, setExpense] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'person' | 'family'>('person');
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const lastAnalyzedDescription = useRef("");

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

  const categoriesList = useMemo(() => {
    const customOnes = trip?.customCategories || [];
    const base = DEFAULT_CATEGORIES.map(c => c.name);
    return Array.from(new Set([...base, ...customOnes]));
  }, [trip?.customCategories]);

  useEffect(() => {
    const trimmedDesc = formData.description.trim();
    if (trimmedDesc.length < 3 || trimmedDesc === lastAnalyzedDescription.current) return;

    const timer = setTimeout(async () => {
      setIsAnalyzing(true);
      lastAnalyzedDescription.current = trimmedDesc;
      try {
        const result = await suggestExpenseCategory({ 
          description: trimmedDesc,
          availableCategories: categoriesList
        });
        if (result.category) {
          setFormData(prev => ({ ...prev, category: result.category }));
        }
      } catch (e) {
        console.warn("AI categorization failed", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.description, categoriesList]);

  const familyList = useMemo(() => {
    if (!trip?.participants) return [];
    return trip.participants.map((p: any, index: number) => {
      const isMe = p.isUser && p.userId === user?.uid;
      const headName = p.name.replace(" (You)", "");
      return {
        ...p,
        scheme: FAMILY_SCHEMES[index % FAMILY_SCHEMES.length],
        familyName: isMe || headName === "You" ? "Your family" : `${headName}'s family`,
      };
    });
  }, [trip, user?.uid]);

  const personList = useMemo(() => {
    const list: any[] = [];
    familyList.forEach((f: any) => {
      list.push({ id: f.id, name: f.name, avatar: f.avatar, familyId: f.id, familyName: f.familyName, scheme: f.scheme });
      f.familyMembers?.forEach((fm: string) => {
        list.push({ id: `${f.id}-${fm}`, name: fm, familyId: f.id, familyName: f.familyName, scheme: f.scheme });
      });
    });
    return list;
  }, [familyList]);

  useEffect(() => {
    if (familyList.length > 0 && Object.keys(expandedFamilies).length === 0) {
      const initialExpanded: Record<string, boolean> = {};
      familyList.forEach((f: any) => { initialExpanded[f.id] = true; });
      setExpandedFamilies(initialExpanded);
    }
  }, [familyList, expandedFamilies]);

  const customSum = useMemo(() => {
    return Object.values(formData.customAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [formData.customAmounts]);

  useEffect(() => {
    if (formData.isItemized) {
      setFormData(prev => ({ ...prev, amount: customSum.toFixed(2) }));
    }
  }, [customSum, formData.isItemized]);

  const isAllSelected = useMemo(() => {
    if (!personList.length) return false;
    return personList.every(p => formData.selectedIndividuals.includes(p.id));
  }, [personList, formData.selectedIndividuals]);

  const handleSelectAll = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedIndividuals: checked ? personList.map(p => p.id) : [],
      customAmounts: checked ? prev.customAmounts : {}
    }));
  };

  const calculateImpact = (data: any) => {
    const deltas: Record<string, number> = {};
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || data.splitType === 'unsplit') return deltas;

    const { splitType, selectedIndividuals, customAmounts, payerId } = data;

    if (splitType === 'custom') {
      selectedIndividuals.forEach((id: string) => {
        const share = parseFloat(customAmounts[id]) || 0;
        deltas[id] = (deltas[id] || 0) - share;
      });
    } else if (splitType === 'equal_person') {
      if (selectedIndividuals.length > 0) {
        const share = amount / selectedIndividuals.length;
        selectedIndividuals.forEach((id: string) => {
          deltas[id] = (deltas[id] || 0) - share;
        });
      }
    } else if (splitType === 'equal_family') {
      const familyIds = Array.from(new Set(selectedIndividuals.map((id: string) => id.split('-')[0])));
      if (familyIds.length > 0) {
        const sharePerFamily = amount / familyIds.length;
        familyIds.forEach((fid: string) => {
          deltas[fid] = (deltas[fid] || 0) - sharePerFamily;
        });
      }
    } else if (splitType === 'just_me') {
      deltas[payerId] = (deltas[payerId] || 0) - amount;
    }

    deltas[payerId] = (deltas[payerId] || 0) + amount;
    return deltas;
  };

  const handleUpdateExpense = async () => {
    if (!tripId || !expenseId || !firestore || !expense) return;

    const amount = parseFloat(formData.amount);
    if (formData.splitType === 'custom' || formData.isItemized) {
      const diff = Math.abs(amount - customSum);
      if (diff > 0.01) {
        toast({ title: "Amounts don't match", description: `Total (₹${amount.toFixed(2)}) must match the sum of splits (₹${customSum.toFixed(2)}).`, variant: "destructive" });
        return;
      }
    }

    setIsUpdating(true);
    const expenseRef = doc(firestore, "trips", tripId as string, "expenses", expenseId as string);
    const tripRef = doc(firestore, "trips", tripId as string);

    try {
      const tripSnap = await getDoc(tripRef);
      const currentBalances = tripSnap.data()?.netBalances || {};
      
      const oldImpact = calculateImpact(expense);
      const newImpact = calculateImpact(formData);

      const updatedBalances = { ...currentBalances };
      Object.entries(oldImpact).forEach(([id, impact]) => { updatedBalances[id] = (updatedBalances[id] || 0) - impact; });
      Object.entries(newImpact).forEach(([id, impact]) => { updatedBalances[id] = (updatedBalances[id] || 0) + impact; });

      const amountDiff = amount - expense.amount;

      await updateDoc(expenseRef, {
        ...formData,
        amount: amount,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(tripRef, {
        totalSpent: increment(amountDiff),
        netBalances: updatedBalances,
        updatedAt: serverTimestamp()
      });

      toast({ title: "Expense updated" });
      router.push(`/trips/${tripId}`);
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: expenseRef.path,
        operation: 'update',
        requestResourceData: formData
      }));
      setIsUpdating(false);
    }
  };

  const handleAddCustomCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || !tripId || !firestore) return;
    const existing = trip?.customCategories || [];
    if (existing.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    const updated = [...existing, trimmed];
    try {
      await updateDoc(doc(firestore, "trips", tripId as string), {
        customCategories: updated,
        updatedAt: serverTimestamp()
      });
      setNewCategoryName("");
      toast({ title: "Category added" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveCustomCategory = async (catName: string) => {
    if (!tripId || !firestore) return;
    const existing = trip?.customCategories || [];
    const updated = existing.filter((c: string) => c !== catName);
    try {
      await updateDoc(doc(firestore, "trips", tripId as string), {
        customCategories: updated,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Category removed" });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelection = (targetId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedIndividuals.includes(targetId);
      const newSelection = isSelected 
        ? prev.selectedIndividuals.filter(id => id !== targetId)
        : [...prev.selectedIndividuals, targetId];
      const newCustomAmounts = { ...prev.customAmounts };
      if (isSelected) delete newCustomAmounts[targetId];
      return { ...prev, selectedIndividuals: newSelection, customAmounts: newCustomAmounts };
    });
  };

  const toggleFamilySelection = (familyId: string) => {
    const family = familyList.find(f => f.id === familyId);
    if (!family) return;
    const memberIds = [family.id, ...(family.familyMembers?.map((fm: string) => `${family.id}-${fm}`) || [])];
    const allSelected = memberIds.every(id => formData.selectedIndividuals.includes(id));

    setFormData(prev => {
      let newSelection = [...prev.selectedIndividuals];
      let newCustomAmounts = { ...prev.customAmounts };
      if (allSelected) {
        newSelection = newSelection.filter(id => !memberIds.includes(id));
        memberIds.forEach(id => delete newCustomAmounts[id]);
      } else {
        memberIds.forEach(id => { if (!newSelection.includes(id)) newSelection.push(id); });
      }
      return { ...prev, selectedIndividuals: newSelection, customAmounts: newCustomAmounts };
    });
  };

  const renderHierarchicalList = (isCustom: boolean, currentView: 'person' | 'family') => {
    const isFamilyView = currentView === 'family';
    return (
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none opacity-40" />
        <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1 px-1 py-4 scrollbar-thin">
          {familyList.map((family) => {
            const members = personList.filter(p => p.familyId === family.id);
            const selectedMembers = members.filter(m => formData.selectedIndividuals.includes(m.id));
            const unselectedMembers = members.filter(m => !formData.selectedIndividuals.includes(m.id));
            
            const isExpanded = expandedFamilies[family.id];
            const hasAnySelected = selectedMembers.length > 0;
            const allSelected = selectedMembers.length === members.length;
            
            return (
              <div key={family.id} className="space-y-2">
                {/* The "Selected" Card */}
                <div 
                  className={cn(
                    "rounded-2xl border-2 transition-all overflow-hidden shadow-sm", 
                    hasAnySelected ? family.scheme.border : "border-muted/10", 
                    hasAnySelected ? family.scheme.bg : "bg-white/50"
                  )}
                >
                  <div 
                    className={cn(
                      "p-3 flex items-center justify-between cursor-pointer transition-colors", 
                      hasAnySelected ? "opacity-100" : "opacity-70 grayscale-[0.2]"
                    )} 
                    onClick={(e) => isFamilyView ? toggleFamilySelection(family.id) : setExpandedFamilies(prev => ({ ...prev, [family.id]: !prev[family.id] }))}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={family.avatar} />
                        <AvatarFallback>{family.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold truncate leading-tight">{family.familyName}</p>
                        <div className="flex items-center gap-1 mt-0.5" onClick={(e) => { e.stopPropagation(); setExpandedFamilies(prev => ({ ...prev, [family.id]: !prev[family.id] })); }}>
                          <span className="text-[10px] text-muted-foreground font-semibold">{members.length} members</span>
                          {!isFamilyView && <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasAnySelected && <span className={cn("text-[10px] font-semibold whitespace-nowrap mr-1", family.scheme.text)}>{selectedMembers.length}/{members.length} selected</span>}
                      {isFamilyView && (
                        <div className="flex items-center gap-3">
                          {allSelected && isCustom && (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <span className="text-xs font-semibold text-muted-foreground">₹</span>
                              <Input type="number" placeholder="0" className={cn("h-9 w-24 rounded-lg text-right font-semibold text-sm border-none shadow-inner bg-black/5 focus-visible:ring-1", family.scheme.focus)} value={formData.customAmounts[family.id] || ""} onChange={e => setFormData(prev => ({ ...prev, customAmounts: { ...prev.customAmounts, [family.id]: e.target.value } }))} />
                            </div>
                          )}
                          <div className={cn("h-7 w-7 rounded-full flex items-center justify-center bg-white shadow-sm", allSelected ? family.scheme.text : "text-muted-foreground")}>{allSelected ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded && !isFamilyView && selectedMembers.length > 0 && (
                    <div className="bg-white/40 divide-y divide-muted/5 animate-in slide-in-from-top-1 duration-200">
                      {selectedMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 pl-8 transition-colors cursor-pointer bg-white/50" onClick={() => toggleSelection(member.id)}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8"><AvatarImage src={member.avatar} /><AvatarFallback>{member.name?.[0]}</AvatarFallback></Avatar>
                            <div><span className="text-xs font-semibold block leading-none">{member.name}</span><span className="text-[9px] text-muted-foreground font-medium">{family.familyName}</span></div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isCustom && (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <span className="text-xs font-semibold text-muted-foreground">₹</span>
                                <Input type="number" placeholder="0" className={cn("h-8 w-20 rounded-lg text-right font-semibold text-xs border-none shadow-inner bg-black/5 focus-visible:ring-1", family.scheme.focus)} value={formData.customAmounts[member.id] || ""} onChange={e => setFormData(prev => ({ ...prev, customAmounts: { ...prev.customAmounts, [member.id]: e.target.value } }))} />
                              </div>
                            )}
                            <div className={cn("h-6 w-6 rounded-full flex items-center justify-center bg-white shadow-sm", family.scheme.text)}><Minus className="h-3 w-3" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* The "Unselected" List (Outside the colored box) */}
                {isExpanded && !isFamilyView && unselectedMembers.length > 0 && (
                  <div className="space-y-1 pl-4 animate-in slide-in-from-top-1 duration-200">
                    {unselectedMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 pl-4 transition-all cursor-pointer rounded-xl hover:bg-muted/10 opacity-60"
                        onClick={() => toggleSelection(member.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-xs font-semibold block leading-none">{member.name}</span>
                            <span className="text-[9px] text-muted-foreground font-medium">{family.familyName}</span>
                          </div>
                        </div>
                        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted/20 text-muted-foreground">
                          <Plus className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none opacity-40" />
      </div>
    );
  };

  const canEdit = !loading && expense && user && (expense.addedBy === user.uid);

  if (loading) return <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4"><AnimatedCompass className="h-12 w-12 text-primary" /><p className="text-sm font-semibold text-muted-foreground animate-pulse">Retrieving expense...</p></div>;

  if (!canEdit) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center"><ShieldAlert className="h-10 w-10 text-destructive" /></div>
        <div className="space-y-2"><h2 className="text-xl font-bold">Access Denied</h2><p className="text-sm text-muted-foreground leading-relaxed">Only the person who added this expense can make changes to it.</p></div>
        <Button className="w-full h-12 rounded-2xl font-bold" variant="outline" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={step === 1 ? () => router.back() : () => setStep(1)}><ChevronLeft className="h-6 w-6" /></Button>
        <div className="flex gap-2">{[1, 2].map(s => <div key={s} className={cn("h-1.5 w-12 rounded-full transition-all duration-300", s <= step ? 'bg-primary' : 'bg-muted')} />)}</div>
        <Button variant="ghost" size="icon" onClick={() => router.push(`/trips/${tripId}`)}><X className="h-6 w-6" /></Button>
      </header>

      <main className="flex-1 px-safe-pad py-8 overflow-y-auto pb-32">
        {step === 1 ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10 text-center space-y-2">
               <h2 className="text-lg font-bold">Audit Mode</h2>
               <p className="text-[10px] text-muted-foreground">You are modifying a live transaction.</p>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <span className={cn("absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-medium transition-colors", formData.amount ? "text-foreground" : "text-muted-foreground/40")}>₹</span>
                <Input type="number" className={cn("h-24 text-4xl font-medium rounded-3xl pl-14 focus-visible:ring-primary shadow-sm bg-white border-none placeholder:text-muted-foreground/30", formData.isItemized && "bg-muted/50 text-muted-foreground/60 cursor-not-allowed")} value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} disabled={formData.isItemized} />
                <div className="absolute right-6 bottom-4 flex items-center gap-2">
                   <Label htmlFor="itemized-split" className="text-xs font-semibold text-muted-foreground/60">Itemized split</Label>
                   <Switch id="itemized-split" checked={formData.isItemized} onCheckedChange={(val) => setFormData(prev => ({ ...prev, isItemized: val, splitType: val ? 'custom' : prev.splitType }))} />
                </div>
              </div>

              {formData.isItemized && (
                <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-primary/20 space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-semibold text-primary">Member split</p>
                      <div className="flex items-center gap-2"><Label className="text-xs font-semibold text-muted-foreground/60">Select all</Label><Switch checked={isAllSelected} onCheckedChange={handleSelectAll} /></div>
                    </div>
                    <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
                      <TabsList className="h-8 bg-muted/50 rounded-xl p-0.5">
                        <TabsTrigger value="person" className="text-[10px] px-3 h-7 font-semibold rounded-lg">Individual</TabsTrigger>
                        <TabsTrigger value="family" className="text-[10px] px-3 h-7 font-semibold rounded-lg">Family</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {renderHierarchicalList(true, viewMode)}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <AlignLeft className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors", formData.description ? "text-foreground stroke-[2px]" : "text-muted-foreground/40")} />
                  <Input placeholder="What was it for?" className="h-16 text-base font-medium rounded-2xl pl-12 pr-4 shadow-sm bg-white border-none" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                  {isAnalyzing && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-14 justify-start font-medium rounded-2xl border-none shadow-sm bg-white hover:bg-muted/50 transition-all">
                          <CalendarIcon className={cn("mr-3 h-4 w-4 transition-all", formData.date ? "text-foreground stroke-[2px]" : "text-muted-foreground/60")} /> 
                          {formData.date ? format(new Date(formData.date), "d MMM yyyy") : "Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-[2rem] border-none shadow-2xl overflow-hidden" align="start">
                        <Calendar mode="single" selected={formData.date ? new Date(formData.date) : undefined} onSelect={(d) => { if (d) { setFormData(prev => ({ ...prev, date: d.toISOString().split('T')[0] })); setIsCalendarOpen(false); } }} disabled={{ after: new Date() }} initialFocus />
                      </PopoverContent>
                   </Popover>
                   <Select value={formData.paymentType} onValueChange={val => setFormData(prev => ({ ...prev, paymentType: val }))}>
                     <SelectTrigger className={cn("h-14 rounded-2xl shadow-sm bg-white border-none focus:ring-primary font-medium", formData.paymentType ? "text-foreground [&_svg]:text-foreground [&_svg]:stroke-[2px]" : "text-muted-foreground/60 [&_svg]:text-muted-foreground/40")}>
                       <div className="flex items-center gap-2">
                         {!formData.paymentType && <CreditCard className="h-4 w-4" />}
                         <SelectValue placeholder="Method" />
                       </div>
                     </SelectTrigger>
                     <SelectContent className="rounded-xl border-none shadow-xl bg-white p-2">
                       {PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id} className="rounded-xl font-semibold py-3 text-xs"><div className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5" />{m.label}</div></SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-sm font-semibold text-muted-foreground/70">Category</Label>
                    <Dialog open={isManagingCategories} onOpenChange={setIsManagingCategories}>
                      <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-semibold text-muted-foreground/40 hover:text-primary transition-colors"><Settings className="h-3 w-3 mr-1" /> Manage</Button></DialogTrigger>
                      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-6 border-none shadow-2xl bg-white animate-in fade-in zoom-in-95 duration-300">
                        <DialogHeader className="mb-6"><DialogTitle className="text-xl font-bold text-center">Manage categories</DialogTitle></DialogHeader>
                        <div className="space-y-6">
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {(trip?.customCategories || []).map((cat: string) => (
                              <div key={cat} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                                <span className="text-sm font-semibold">{cat}</span>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleRemoveCustomCategory(cat)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            ))}
                          </div>
                          <div className="pt-6 border-t space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground/70">Add new</p>
                            <div className="flex gap-3">
                              <Input placeholder="e.g. Safari" className="h-14 rounded-2xl bg-muted/40 border-none font-semibold" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomCategory()} />
                              <Button className="h-14 w-14 rounded-2xl bg-primary text-white shrink-0" onClick={handleAddCustomCategory}><Plus className="h-6 w-6" /></Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {categoriesList.slice(0, 11).map(catName => {
                      const baseCat = DEFAULT_CATEGORIES.find(c => c.name === catName);
                      const Icon = baseCat?.icon || Box;
                      const isSelected = formData.category === catName;
                      return (
                        <Card key={catName} className={cn("p-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1", isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-white shadow-sm hover:border-muted/20")} onClick={() => setFormData(prev => ({ ...prev, category: catName }))}>
                          <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center transition-colors", isSelected ? "bg-primary text-white" : "text-muted-foreground/50")}><Icon className="h-4 w-4" /></div>
                          <span className={cn("text-[8px] font-semibold text-center truncate w-full", isSelected ? "text-foreground" : "text-muted-foreground")}>{catName}</span>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-muted-foreground/70">Who paid?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {trip?.participants?.map((p: any) => {
                    const isMe = p.isUser && p.userId === user?.uid;
                    const isSelected = formData.payerId === p.id;
                    return (
                      <Card key={p.id} className={cn("p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3", isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-white shadow-sm hover:border-muted/20')} onClick={() => setFormData(prev => ({ ...prev, payerId: p.id, payerName: p.name }))}>
                        <Avatar className="h-8 w-8 shadow-sm"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name?.[0]}</AvatarFallback></Avatar>
                        <span className={cn("font-semibold text-xs truncate", isSelected ? "text-foreground" : "text-foreground/80")}>{isMe ? "You" : p.name}</span>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="space-y-2">
                <div className="flex justify-between items-end">
                   <div><h1 className="text-2xl font-bold">Splitting</h1><p className="text-muted-foreground font-medium">Dividing ₹{parseFloat(formData.amount || "0").toFixed(2)}</p></div>
                   {formData.splitType === 'custom' && (
                     <div className="text-right">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Sum</p>
                        <p className={cn("text-sm font-semibold", Math.abs(parseFloat(formData.amount || "0") - customSum) > 0.01 ? "text-destructive" : "text-primary")}>₹{customSum.toFixed(2)}</p>
                     </div>
                   )}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               {[
                 { id: "equal_person", label: "Per person", icon: Users, desc: "Include all members" },
                 { id: "equal_family", label: "Per family", icon: Home, desc: "One per family unit" },
                 { id: "custom", label: "Custom amount", icon: Calculator, desc: "Specific ₹ per person" },
                 { id: "just_me", label: "Just you", icon: User, desc: "100% to you" }
               ].map(mode => (
                 <Card key={mode.id} className={cn("p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col gap-2 bg-white shadow-sm", formData.splitType === mode.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent hover:border-muted/20")} onClick={() => setFormData(prev => ({ ...prev, splitType: mode.id }))}>
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors", formData.splitType === mode.id ? "bg-primary text-white" : "bg-muted text-muted-foreground/50")}><mode.icon className="h-5 w-5" /></div>
                    <div className="mt-2"><p className="font-semibold text-sm tracking-tight">{mode.label}</p><p className="text-[10px] text-muted-foreground/60 font-medium leading-tight">{mode.desc}</p></div>
                 </Card>
               ))}
             </div>

             {(formData.splitType !== 'just_me' && formData.splitType !== 'unsplit') && (
               <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-primary/20 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-primary">Member selection</p>
                    <div className="flex items-center gap-2"><Label className="text-xs font-semibold text-muted-foreground/60">Select all</Label><Switch checked={isAllSelected} onCheckedChange={handleSelectAll} /></div>
                  </div>
                  {renderHierarchicalList(
                    formData.splitType === 'custom',
                    formData.splitType === 'equal_family' ? 'family' : 'person'
                  )}
               </div>
             )}
          </div>
        )}
      </main>

      <footer className="p-safe-pad border-t bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20 shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
         {step === 1 ? (
            <Button className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 gap-2 transition-all active:scale-95" onClick={() => setStep(2)}>Choose splitting <ChevronRight className="h-5 w-5" /></Button>
         ) : (
            <Button className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 gap-2 transition-all active:scale-95" onClick={handleUpdateExpense} disabled={isUpdating}>
               {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4" /> Save changes</>}
            </Button>
         )}
      </footer>
    </div>
  );
}
