
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  X,
  Loader2,
  Users,
  User,
  Home,
  Plus,
  Minus,
  Calculator,
  Pin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { AnimatedCompass } from "@/components/animated-compass";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

const FAMILY_SCHEMES = [
  { border: "border-primary", bg: "bg-primary/5", text: "text-primary", badge: "bg-primary/10 text-primary", darkBg: "bg-primary/10", focus: "focus-visible:ring-primary" },
  { border: "border-accent", bg: "bg-accent/5", text: "text-accent", badge: "bg-accent/10 text-accent", darkBg: "bg-accent/10", focus: "focus-visible:ring-accent" },
  { border: "border-secondary", bg: "bg-secondary/5", text: "text-secondary", badge: "bg-secondary/10 text-secondary", darkBg: "bg-secondary/10", focus: "focus-visible:ring-secondary" },
  { border: "border-blue-500", bg: "bg-blue-500/5", text: "text-blue-500", badge: "bg-blue-500/10 text-blue-500", darkBg: "bg-blue-500/10", focus: "focus-visible:ring-blue-500" },
  { border: "border-green-500", bg: "bg-green-500/5", text: "text-green-500", badge: "bg-green-500/10 text-green-500", darkBg: "bg-green-500/10", focus: "focus-visible:ring-green-500" },
];

export default function CompleteSplitPage() {
  const router = useRouter();
  const { id: tripId, expenseId } = useParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [expense, setExpense] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'person' | 'family'>('person');
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    splitType: "equal_person",
    selectedIndividuals: [] as string[],
    customAmounts: {} as Record<string, string>,
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
          splitType: data.splitType === 'unsplit' ? 'equal_person' : data.splitType,
          selectedIndividuals: data.selectedIndividuals || [],
          customAmounts: data.customAmounts || {},
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

  const familyList = useMemo(() => {
    if (!trip?.participants) return [];
    return trip.participants.map((p: any, index: number) => ({
      ...p,
      scheme: FAMILY_SCHEMES[index % FAMILY_SCHEMES.length],
      familyName: p.name.includes("(You)") ? "Your family" : `${p.name}'s family`,
    }));
  }, [trip]);

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

  const customSum = useMemo(() => {
    return Object.values(formData.customAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [formData.customAmounts]);

  const handleSaveSplit = () => {
    if (!firestore || !tripId || !expenseId || !expense) return;

    if (formData.splitType === 'custom') {
      const diff = Math.abs(expense.amount - customSum);
      if (diff > 0.01) {
        toast({ 
          title: "Amounts don't match", 
          description: `Sum (₹${customSum.toFixed(2)}) must equal Total (₹${expense.amount.toFixed(2)}).`,
          variant: "destructive" 
        });
        return;
      }
    }

    setIsPosting(true);
    const expenseRef = doc(firestore, "trips", tripId as string, "expenses", expenseId as string);
    const updateData = {
      ...formData,
      updatedAt: serverTimestamp()
    };

    updateDoc(expenseRef, updateData)
      .then(() => {
        toast({ title: "Split finalized!", description: "The expense has been successfully divided." });
        router.push(`/trips/${tripId}`);
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: expenseRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
        setIsPosting(false);
      });
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
      <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
        {familyList.map((family) => {
          const members = personList.filter(p => p.familyId === family.id);
          const memberIds = members.map(m => m.id);
          const allSelected = memberIds.every(id => formData.selectedIndividuals.includes(id));
          const isExpanded = expandedFamilies[family.id];
          
          return (
            <div key={family.id} className={cn("rounded-2xl border-2 transition-all overflow-hidden shadow-sm", allSelected ? family.scheme.border : "border-muted/10", family.scheme.bg)}>
              <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => isFamilyView ? toggleFamilySelection(family.id) : setExpandedFamilies(prev => ({ ...prev, [family.id]: !prev[family.id] }))}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white"><AvatarImage src={family.avatar} /><AvatarFallback>{family.name?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-semibold truncate leading-tight">{family.familyName}</p>
                    {!isFamilyView && <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">{members.length} members <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} /></span>}
                  </div>
                </div>
                {isFamilyView && (
                  <div className="flex items-center gap-3">
                    {allSelected && isCustom && <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}><span className="text-xs font-semibold text-muted-foreground">₹</span><Input type="number" className="h-9 w-24 rounded-lg text-right font-semibold" value={formData.customAmounts[family.id] || ""} onChange={e => setFormData(prev => ({ ...prev, customAmounts: { ...prev.customAmounts, [family.id]: e.target.value } }))} /></div>}
                    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center bg-white", allSelected ? family.scheme.text : "text-muted-foreground")}>{allSelected ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</div>
                  </div>
                )}
              </div>
              {isExpanded && !isFamilyView && (
                <div className="bg-white/40 divide-y divide-muted/5">
                  {members.map((member) => {
                    const isSel = formData.selectedIndividuals.includes(member.id);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 pl-8 cursor-pointer" onClick={() => toggleSelection(member.id)}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={member.avatar} /><AvatarFallback>{member.name?.[0]}</AvatarFallback></Avatar>
                          <span className="text-xs font-semibold">{member.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {isSel && isCustom && <div onClick={e => e.stopPropagation()}><Input type="number" className="h-8 w-20 text-right text-xs" value={formData.customAmounts[member.id] || ""} onChange={e => setFormData(prev => ({ ...prev, customAmounts: { ...prev.customAmounts, [member.id]: e.target.value } }))} /></div>}
                          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center bg-white shadow-sm", isSel ? family.scheme.text : "text-muted-foreground")}>{isSel ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4"><AnimatedCompass className="h-12 w-12 text-primary" /><p className="text-sm font-semibold text-muted-foreground">Loading expense details...</p></div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft className="h-6 w-6" /></Button>
        <h1 className="text-lg font-bold">Finalize Split</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push(`/trips/${tripId}`)}><X className="h-6 w-6" /></Button>
      </header>

      <main className="flex-1 px-safe-pad py-8 overflow-y-auto space-y-8 pb-32">
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{expense.description}</h2>
              <p className="text-muted-foreground font-medium">Divide ₹{parseFloat(expense.amount).toFixed(2)}</p>
            </div>
            {formData.splitType === 'custom' && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Sum</p>
                <p className={cn("text-sm font-semibold", Math.abs(parseFloat(expense.amount) - customSum) > 0.01 ? "text-destructive" : "text-primary")}>₹{customSum.toFixed(2)}</p>
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
          ].map(mode => {
            const isSelected = formData.splitType === mode.id;
            return (
              <Card key={mode.id} className={cn("relative p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col gap-2 bg-white", isSelected ? "border-primary bg-primary/5 shadow-md" : "border-transparent hover:border-muted/20")} onClick={() => setFormData(prev => ({ ...prev, splitType: mode.id }))}>
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground/50")}><mode.icon className="h-5 w-5" /></div>
                <div className="mt-2"><p className="font-semibold text-sm tracking-tight">{mode.label}</p><p className="text-[10px] text-muted-foreground/60 font-medium leading-tight">{mode.desc}</p></div>
              </Card>
            );
          })}
        </div>

        {(formData.splitType === 'equal_family' || formData.splitType === 'equal_person' || formData.splitType === 'custom') && (
          <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-primary/20 space-y-4 shadow-sm">
            <div className="flex justify-between items-center"><p className="text-xs font-semibold text-primary">Member selection</p><div className="flex items-center gap-2"><Label className="text-xs font-semibold text-muted-foreground/60">Select all</Label><Switch checked={isAllSelected} onCheckedChange={handleSelectAll} /></div></div>
            <div className="flex justify-end mb-2">
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
                <TabsList className="h-8 bg-muted/50 rounded-xl p-0.5">
                  <TabsTrigger value="person" className="text-[10px] px-3 h-7 font-semibold rounded-lg">Individual</TabsTrigger>
                  <TabsTrigger value="family" className="text-[10px] px-3 h-7 font-semibold rounded-lg">Family</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {renderHierarchicalList(formData.splitType === 'custom', viewMode)}
          </div>
        )}
      </main>

      <footer className="p-safe-pad border-t bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20 shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
        <Button className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 gap-2" onClick={handleSaveSplit} disabled={isPosting}>
          {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Finalize Split <ChevronRight className="h-5 w-5" /></>}
        </Button>
      </footer>
    </div>
  );
}
