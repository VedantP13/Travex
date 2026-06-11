"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  X,
  Check,
  Loader2,
  Calendar,
  CreditCard,
  Tag,
  Users,
  User,
  Home,
  MapPin,
  AlignLeft,
  Plus,
  Minus,
  Calculator,
  Zap,
  ShieldAlert,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useTrips } from "@/context/trips-context";
import Link from "next/link";
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

export default function AddExpenseWizard() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const { trips, loading: tripsLoading } = useTrips();
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>((params?.id as string) || "");
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'person' | 'family'>('person');
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    payerId: "",
    payerName: "",
    splitType: "equal_person",
    selectedIndividuals: [] as string[],
    customAmounts: {} as Record<string, string>,
    isItemized: false,
    date: new Date().toISOString().split('T')[0],
    paymentType: "UPI",
    category: ""
  });

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }

    if (user?.isAnonymous) {
      setShowGuestPrompt(true);
    }
  }, [selectedTripId, trips, user]);

  useEffect(() => {
    if (!selectedTripId || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, "trips", selectedTripId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentTrip({ id: snapshot.id, ...data });
        
        // Find current user in participants to set as default payer
        const me = data.participants.find((p: any) => p.isUser && p.userId === user?.uid) || data.participants[0];
        if (me && !formData.payerId) {
          setFormData(prev => ({ 
            ...prev, 
            payerId: me.id,
            payerName: me.name
          }));
        }
      }
    });
    return () => unsubscribe();
  }, [selectedTripId, user, firestore, formData.payerId]);

  const familyList = useMemo(() => {
    if (!currentTrip?.participants) return [];
    return currentTrip.participants.map((p: any, index: number) => ({
      ...p,
      scheme: FAMILY_SCHEMES[index % FAMILY_SCHEMES.length],
      familyName: `${p.name.replace(" (You)", "")}'s Family`,
      type: 'family-group'
    }));
  }, [currentTrip]);

  const personList = useMemo(() => {
    const list: any[] = [];
    familyList.forEach((f: any) => {
      list.push({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
        familyId: f.id,
        familyName: f.familyName,
        scheme: f.scheme,
        type: 'participant'
      });
      f.familyMembers?.forEach((fm: string) => {
        list.push({
          id: `${f.id}-${fm}`,
          name: fm,
          familyId: f.id,
          familyName: f.familyName,
          scheme: f.scheme,
          type: 'family'
        });
      });
    });
    return list;
  }, [familyList]);

  useEffect(() => {
    if (familyList.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      familyList.forEach((f: any) => {
        initialExpanded[f.id] = true;
      });
      setExpandedFamilies(initialExpanded);
    }
  }, [familyList]);

  useEffect(() => {
    if (viewMode === 'person' && familyList.length > 0) {
      const allExpanded: Record<string, boolean> = {};
      familyList.forEach((f: any) => {
        allExpanded[f.id] = true;
      });
      setExpandedFamilies(allExpanded);
    }
  }, [viewMode, familyList]);

  const isAllSelected = useMemo(() => {
    if (!personList.length) return false;
    return personList.every(p => formData.selectedIndividuals.includes(p.id));
  }, [personList, formData.selectedIndividuals]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedIndividuals: personList.map(p => p.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedIndividuals: [],
        customAmounts: {}
      }));
    }
  };

  useEffect(() => {
    if (formData.isItemized) {
      setFormData(prev => ({ ...prev, splitType: 'custom' }));
    } else {
      if (formData.splitType === 'equal_person') {
        setFormData(prev => ({ ...prev, selectedIndividuals: personList.map(t => t.id) }));
      } else if (formData.splitType === 'equal_family') {
        setFormData(prev => ({ ...prev, selectedIndividuals: familyList.map(p => p.id) }));
      } else if (formData.splitType === 'just_me') {
        setFormData(prev => ({ ...prev, selectedIndividuals: [formData.payerId] }));
      }
    }
  }, [formData.isItemized, formData.splitType, personList, familyList, formData.payerId]);

  const customSum = useMemo(() => {
    return Object.values(formData.customAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [formData.customAmounts]);

  useEffect(() => {
    if (formData.isItemized) {
      setFormData(prev => ({ ...prev, amount: customSum.toFixed(2) }));
    }
  }, [customSum, formData.isItemized]);

  const handleDescriptionBlur = async () => {
    if (formData.description.length > 3 && !formData.category) {
      setIsAnalyzing(true);
      try {
        const result = await suggestExpenseCategory({ description: formData.description });
        setFormData(prev => ({ ...prev, category: result.category }));
      } catch (e) {
        console.warn("AI categorization failed", e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.isItemized && !formData.amount) {
        toast({ title: "Enter an amount", variant: "destructive" });
        return;
      }
      if (!formData.description) {
        toast({ title: "Enter a description", variant: "destructive" });
        return;
      }
      if (formData.isItemized) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else {
      setStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    if (step === 3 && formData.isItemized) {
      setStep(1);
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handlePostExpense = (overrideSplitType?: string) => {
    if (!selectedTripId || !formData.amount || !formData.description || !firestore) return;
    
    if (formData.splitType === 'custom' && !formData.isItemized && !overrideSplitType) {
      const diff = Math.abs(parseFloat(formData.amount) - customSum);
      if (diff > 0.01) {
        toast({ 
          title: "Amounts don't match", 
          description: `The sum of custom amounts (₹${customSum.toFixed(2)}) must equal the total amount (₹${parseFloat(formData.amount).toFixed(2)}).`,
          variant: "destructive" 
        });
        return;
      }
    }

    setIsPosting(true);
    
    const amount = parseFloat(formData.amount);
    const expenseRef = collection(firestore, "trips", selectedTripId, "expenses");
    const expenseData = {
      ...formData,
      amount: amount,
      splitType: overrideSplitType || formData.splitType,
      createdAt: serverTimestamp(),
      addedBy: user?.uid
    };

    addDoc(expenseRef, expenseData)
      .then(() => {
        toast({
          title: overrideSplitType === 'unsplit' ? "Saved as draft" : "Expense posted!",
          description: overrideSplitType === 'unsplit' 
            ? "Expense saved. You can split it later from the trip dashboard."
            : `Successfully added ₹${amount.toFixed(2)} to ${currentTrip?.name}.`
        });
        router.push(`/trips/${selectedTripId}`);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: expenseRef.path,
          operation: 'create',
          requestResourceData: expenseData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsPosting(false);
      });

    updateDoc(doc(firestore, "trips", selectedTripId), {
      totalSpent: increment(amount)
    }).catch(() => {});
  };

  const handleSplitLater = () => {
    handlePostExpense('unsplit');
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
        memberIds.forEach(id => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
      }

      return { ...prev, selectedIndividuals: newSelection, customAmounts: newCustomAmounts };
    });
  };

  const updateCustomAmount = (targetId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customAmounts: { ...prev.customAmounts, [targetId]: value }
    }));
  };

  const toggleExpand = (e: React.MouseEvent, familyId: string) => {
    e.stopPropagation();
    setExpandedFamilies(prev => ({ ...prev, [familyId]: !prev[familyId] }));
  };

  const renderHierarchicalList = (isCustom: boolean, currentView: 'person' | 'family') => {
    const groups = familyList.map(f => ({
      ...f,
      members: personList.filter(p => p.familyId === f.id)
    }));

    const isFamilyView = currentView === 'family';

    return (
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none opacity-40" />
        
        <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1 px-1 py-4 scrollbar-thin">
          {groups.map((family) => {
            const memberIds = [family.id, ...(family.members.map(m => m.id).filter(id => id !== family.id))];
            const allSelected = memberIds.every(id => formData.selectedIndividuals.includes(id));
            const isExpanded = expandedFamilies[family.id];
            
            const selectedCount = memberIds.filter(id => formData.selectedIndividuals.includes(id)).length;
            const totalCount = memberIds.length;

            return (
              <div 
                key={family.id} 
                className={cn(
                  "rounded-2xl border-2 transition-all overflow-hidden shadow-sm",
                  allSelected ? family.scheme.border : "border-muted/10",
                  family.scheme.bg
                )}
              >
                <div 
                  className={cn(
                    "p-3 flex items-center justify-between cursor-pointer transition-colors",
                    allSelected ? "opacity-100" : "opacity-70 grayscale-[0.2]"
                  )}
                  onClick={(e) => isFamilyView ? toggleFamilySelection(family.id) : toggleExpand(e, family.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={family.avatar} />
                      <AvatarFallback>{family.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold truncate leading-tight">{family.familyName}</p>
                      <div 
                        className="flex items-center gap-1 mt-0.5"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(e, family.id); }}
                      >
                        <span className="text-[10px] text-muted-foreground font-bold">{family.members.length} members</span>
                        {!isFamilyView && (
                          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {selectedCount > 0 && (
                      <span className={cn("text-[10px] font-bold whitespace-nowrap mr-1", family.scheme.text)}>
                        {selectedCount}/{totalCount} selected
                      </span>
                    )}

                    {isFamilyView && allSelected && isCustom && (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-bold text-muted-foreground">₹</span>
                        <Input 
                          type="number" 
                          placeholder="0"
                          className={cn(
                            "h-9 w-24 rounded-lg text-right font-bold text-sm border-none shadow-inner bg-black/5 focus-visible:ring-1",
                            family.scheme.focus
                          )}
                          value={formData.customAmounts[family.id] || ""}
                          onChange={e => updateCustomAmount(family.id, e.target.value)}
                        />
                      </div>
                    )}
                    
                    {isFamilyView && (
                      allSelected ? (
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center bg-white shadow-sm", family.scheme.text)}>
                          <Minus className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full flex items-center justify-center bg-white/50 shadow-sm text-muted-foreground">
                          <Plus className="h-4 w-4" />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {isExpanded && !isFamilyView && (
                  <div className="bg-white/40 divide-y divide-muted/5 animate-in slide-in-from-top-1 duration-200">
                    {family.members.map((member) => {
                      const isMemberSelected = formData.selectedIndividuals.includes(member.id);
                      return (
                        <div 
                          key={member.id} 
                          className={cn(
                            "flex items-center justify-between p-3 pl-8 transition-colors cursor-pointer",
                            isMemberSelected ? "bg-white/50" : "opacity-60"
                          )}
                          onClick={() => !isFamilyView && toggleSelection(member.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="text-xs font-bold block leading-none">{member.name}</span>
                              <span className="text-[9px] text-muted-foreground font-medium">{family.familyName}</span>
                            </div>
                          </div>
                          
                          {!isFamilyView && (
                            <div className="flex items-center gap-3">
                              {isMemberSelected && isCustom && (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                                  <Input 
                                    type="number" 
                                    placeholder="0"
                                    className={cn(
                                      "h-8 w-20 rounded-lg text-right font-bold text-xs border-none shadow-inner bg-black/5 focus-visible:ring-1",
                                      family.scheme.focus
                                    )}
                                    value={formData.customAmounts[member.id] || ""}
                                    onChange={e => updateCustomAmount(member.id, e.target.value)}
                                  />
                                </div>
                              )}
                              
                              {isMemberSelected ? (
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center bg-white shadow-sm", family.scheme.text)}>
                                  <Minus className="h-3 w-3" />
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-white/50 shadow-sm text-muted-foreground">
                                  <Plus className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

  if (tripsLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AnimatedCompass className="h-12 w-12 text-primary" />
        <p className="text-sm font-bold text-muted-foreground">Checking your trips...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={step === 1 ? () => router.back() : prevStep}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1.5 w-12 rounded-full transition-all duration-300 ${s <= step || (step === 3 && s === 2 && formData.isItemized) ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <X className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 px-safe-pad py-8 overflow-y-auto pb-32">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Amount</h1>
                <Select value={selectedTripId} onValueChange={(val) => setSelectedTripId(val)}>
                  <SelectTrigger className="w-[160px] h-9 rounded-2xl border-primary/20 bg-primary/5 text-primary font-bold text-[10px] focus:ring-0">
                    <MapPin className="h-3 w-3 mr-1.5" />
                    <SelectValue placeholder="Select trip" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {trips.map(trip => (
                      <SelectItem key={trip.id} value={trip.id} className="text-xs font-bold py-3">
                        {trip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Adding to <span className="text-primary font-bold">{currentTrip?.name || "..."}</span>
              </p>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-muted-foreground">₹</span>
                <Input 
                  type="number"
                  placeholder={formData.isItemized ? "Total calculated" : "0.00"}
                  className={cn(
                    "h-20 text-4xl font-bold rounded-2xl pl-12 focus-visible:ring-primary shadow-sm",
                    formData.isItemized && "bg-muted text-muted-foreground/60 cursor-not-allowed"
                  )}
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  disabled={formData.isItemized}
                />
                <div className="absolute right-4 bottom-2 flex items-center gap-2">
                   <Label htmlFor="itemized-split" className="text-[10px] font-bold text-muted-foreground uppercase">Itemized Split</Label>
                   <Switch 
                     id="itemized-split" 
                     checked={formData.isItemized} 
                     onCheckedChange={(val) => setFormData(prev => ({ 
                        ...prev, 
                        isItemized: val, 
                        amount: val ? "" : prev.amount,
                        splitType: val ? 'custom' : 'equal_person',
                        customAmounts: val ? {} : prev.customAmounts
                     }))} 
                   />
                </div>
              </div>

              {formData.isItemized && (
                <div className="bg-white p-5 rounded-2xl border border-dashed border-primary/20 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-bold text-primary">Member split</p>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="select-all-step1" className="text-[10px] font-bold text-muted-foreground uppercase">Select All</Label>
                        <Switch 
                          id="select-all-step1" 
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                        />
                      </div>
                    </div>
                    <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
                      <TabsList className="h-7 bg-muted/50 rounded-lg p-0.5">
                        <TabsTrigger value="person" className="text-[9px] px-2 h-6 font-bold">Individual</TabsTrigger>
                        <TabsTrigger value="family" className="text-[9px] px-2 h-6 font-bold">Family</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {renderHierarchicalList(true, viewMode)}
                </div>
              )}

              <div className="relative">
                <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                <Input 
                  placeholder="What was it for?"
                  className="h-16 text-lg rounded-2xl pl-12 pr-4 focus-visible:ring-primary shadow-sm"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  onBlur={handleDescriptionBlur}
                />
                {isAnalyzing && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-muted-foreground ml-1">Who paid?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {currentTrip?.participants?.map((p: any) => {
                    const isMe = p.isUser && p.userId === user?.uid;
                    return (
                      <Card 
                        key={p.id}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${formData.payerId === p.id ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'}`}
                        onClick={() => setFormData(prev => ({ ...prev, payerId: p.id, payerName: p.name }))}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.avatar} />
                          <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm truncate">{isMe ? "You" : p.name}</span>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && !formData.isItemized && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold">Split</h1>
                  <p className="text-muted-foreground">Divide ₹{formData.amount || '0.00'}</p>
                </div>
                {formData.splitType === 'custom' && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Sum</p>
                    <p className={cn(
                      "text-sm font-bold",
                      Math.abs(parseFloat(formData.amount || "0") - customSum) > 0.01 ? "text-destructive" : "text-primary"
                    )}>
                      ₹{customSum.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "equal_person", label: "Per person", icon: Users, desc: "Include all members" },
                { id: "equal_family", label: "Per family", icon: Home, desc: "One per family unit" },
                { id: "custom", label: "Custom amount", icon: Calculator, desc: "Specific ₹ per person" },
                { id: "just_me", label: "Just you", icon: User, desc: "100% to you" }
              ].map(mode => (
                <Card 
                  key={mode.id}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${formData.splitType === mode.id ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'}`}
                  onClick={() => setFormData(prev => ({ ...prev, splitType: mode.id }))}
                >
                  <mode.icon className={`h-6 w-6 ${formData.splitType === mode.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="mt-2">
                    <p className="font-bold text-sm">{mode.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{mode.desc}</p>
                  </div>
                </Card>
              ))}
            </div>

            {(formData.splitType === 'equal_family' || formData.splitType === 'equal_person' || formData.splitType === 'custom') && (
              <div className="bg-white p-5 rounded-2xl border border-dashed border-primary/20 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-primary">Member selection</p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="select-all-step2" className="text-[10px] font-bold text-muted-foreground uppercase">Select All</Label>
                    <Switch 
                      id="select-all-step2" 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                    />
                  </div>
                </div>
                
                {renderHierarchicalList(
                  formData.splitType === 'custom',
                  formData.splitType === 'equal_family' ? 'family' : 'person'
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Details</h1>
              <p className="text-muted-foreground">Finalize date and category.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-muted-foreground ml-1">Date</Label>
                <div className="relative">
                  <Input 
                    type="date"
                    className="h-14 rounded-2xl pl-12 focus-visible:ring-primary shadow-sm"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-muted-foreground ml-1">Payment type</Label>
                <div className="relative">
                  <Select 
                    value={formData.paymentType} 
                    onValueChange={val => setFormData(prev => ({ ...prev, paymentType: val }))}
                  >
                    <SelectTrigger className="h-14 rounded-2xl shadow-sm focus:ring-primary">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <SelectValue placeholder="Payment method" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="UPI">UPI (GPay/PhonePe)</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Credit/Debit Card</SelectItem>
                      <SelectItem value="Net Banking">Net Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-muted-foreground ml-1">Category tags</Label>
                <div className="relative">
                  <Input 
                    placeholder="e.g. Dining, Travel"
                    className="h-14 rounded-2xl pl-12 focus-visible:ring-primary shadow-sm"
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  />
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-safe-pad border-t bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20">
        <div className="flex gap-3">
          {step === 1 && (
            <Button 
              variant="outline"
              className="flex-1 h-14 rounded-2xl text-lg font-bold border-primary text-primary"
              onClick={handleSplitLater}
              disabled={isPosting || !formData.amount || !formData.description}
            >
              {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Split later"}
            </Button>
          )}
          <Button 
            className={cn(
              "h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2",
              step === 1 ? "flex-1" : "w-full"
            )}
            onClick={step === 3 ? handlePostExpense : nextStep}
            disabled={isPosting || (step === 1 && !formData.isItemized && !formData.amount)}
          >
            {isPosting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                {step === 1 ? "Split now" : step === 3 ? "Post expense" : "Next step"}
                {step !== 3 && <ChevronRight className="h-5 w-5" />}
              </>
            )}
          </Button>
        </div>
      </footer>

      <Dialog open={showGuestPrompt} onOpenChange={setShowGuestPrompt}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Brand Header Section */}
          <div className="h-44 bg-foreground relative flex items-center justify-center overflow-hidden">
             {/* Glowing Pulse Background */}
             <div className="absolute h-40 w-40 bg-accent/20 rounded-full blur-[60px] animate-pulse" />
             
             {/* Shield Icon with Rings */}
             <div className="relative z-10 flex items-center justify-center">
               <div className="absolute h-24 w-24 rounded-full border border-accent/20 animate-ping duration-[3s]" />
               <div className="absolute h-20 w-20 rounded-full border border-accent/30 animate-ping duration-[4s]" />
               <div className="h-20 w-20 bg-accent/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-accent shadow-[0_0_40px_rgba(245,166,35,0.2)] border border-accent/20">
                 <ShieldAlert className="h-10 w-10" strokeWidth={2} />
               </div>
             </div>
          </div>

          <div className="p-8 pt-10 space-y-6 text-center">
            <div className="space-y-3">
              <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">
                Secure your adventure
              </DialogTitle>
              <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
                You're in <span className="text-accent font-extrabold uppercase tracking-tight">Guest Mode</span>. Link your account to sync your trips across all devices and prevent data loss.
              </DialogDescription>
            </div>

            <div className="space-y-4 pt-4 flex flex-col items-center">
              <Link href="/login" className="w-full max-w-[280px]">
                <Button className="w-full h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base gap-3 shadow-[0_12px_24px_-8px_rgba(245,166,35,0.4)] transition-all active:scale-95 group">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5 brightness-0 invert" alt="Google" />
                  Link my account now
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted transition-all text-sm"
                onClick={() => setShowGuestPrompt(false)}
              >
                Continue as guest explorer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
