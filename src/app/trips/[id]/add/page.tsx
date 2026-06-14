
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  X,
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
  Pin,
  Utensils,
  Car,
  ShoppingBag,
  Camera,
  Plane,
  Box,
  Settings,
  Trash2,
  Smartphone,
  Banknote,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useTrips } from "@/context/trips-context";
import { AnimatedCompass } from "@/components/animated-compass";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
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
  const isSplitTypeManuallyChanged = useRef(false);
  const lastAnalyzedDescription = useRef("");
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isManagingCategories, setIsManagingCategories] = useState(false);

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
    paymentType: "",
    category: "Other"
  });

  const categoriesList = useMemo(() => {
    const customOnes = currentTrip?.customCategories || [];
    const base = DEFAULT_CATEGORIES.map(c => c.name);
    return Array.from(new Set([...base, ...customOnes]));
  }, [currentTrip?.customCategories]);

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      const active = trips.find(t => t.status === 'Active');
      setSelectedTripId(active ? active.id : trips[0].id);
    }
  }, [selectedTripId, trips]);

  useEffect(() => {
    if (!selectedTripId || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, "trips", selectedTripId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentTrip({ id: snapshot.id, ...data });
        
        const me = data.participants.find((p: any) => p.isUser && p.userId === user?.uid) || data.participants[0];
        
        setFormData(prev => {
          const updates: any = {};
          if (!prev.payerId && me) {
            updates.payerId = me.id;
            updates.payerName = me.name;
          }
          if (data.defaultSplitType && !isSplitTypeManuallyChanged.current) {
            updates.splitType = data.defaultSplitType;
          }
          return { ...prev, ...updates };
        });
      }
    });
    return () => unsubscribe();
  }, [selectedTripId, user, firestore]);

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
    if (!currentTrip?.participants) return [];
    return currentTrip.participants.map((p: any, index: number) => {
      const isMe = p.isUser && p.userId === user?.uid;
      const headName = p.name.replace(" (You)", "");
      
      return {
        ...p,
        scheme: FAMILY_SCHEMES[index % FAMILY_SCHEMES.length],
        familyName: isMe || headName === "You" ? "Your family" : `${headName}'s family`,
        type: 'family-group'
      };
    });
  }, [currentTrip, user?.uid]);

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
      if (formData.splitType === 'equal_person' || formData.splitType === 'custom' || formData.splitType === 'equal_family') {
        setFormData(prev => ({ ...prev, selectedIndividuals: personList.map(t => t.id) }));
      } else if (formData.splitType === 'just_me') {
        setFormData(prev => ({ ...prev, selectedIndividuals: [formData.payerId] }));
      }
    }
  }, [formData.isItemized, formData.splitType, personList, formData.payerId]);

  const customSum = useMemo(() => {
    return Object.values(formData.customAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [formData.customAmounts]);

  useEffect(() => {
    if (formData.isItemized) {
      setFormData(prev => ({ ...prev, amount: customSum.toFixed(2) }));
    }
  }, [customSum, formData.isItemized]);

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
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
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
        
        // Auto-transition to Active if trip is Upcoming
        if (currentTrip?.status === 'Upcoming') {
          updateDoc(doc(firestore, "trips", selectedTripId), {
            status: 'Active'
          }).catch(() => {});
        }

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

  const toggleTripDefaultSplit = (modeId: string) => {
    if (!firestore || !selectedTripId) return;
    
    const isCurrentlyDefault = currentTrip?.defaultSplitType === modeId;
    const newDefault = isCurrentlyDefault ? null : modeId;
    
    updateDoc(doc(firestore, "trips", selectedTripId), {
      defaultSplitType: newDefault
    }).then(() => {
      toast({
        title: newDefault ? "Preference saved" : "Preference removed",
        description: newDefault 
          ? `${modeId.replace('_', ' ')} will now be pre-selected for this trip.`
          : "Default split mode has been cleared."
      });
    }).catch(err => console.error("Failed to save default:", err));
  };

  const handleAddCustomCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || !selectedTripId || !firestore) return;
    const existing = currentTrip?.customCategories || [];
    if (existing.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    const updated = [...existing, trimmed];
    try {
      await updateDoc(doc(firestore, "trips", selectedTripId), {
        customCategories: updated
      });
      setNewCategoryName("");
      toast({ title: "Category added" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveCustomCategory = async (catName: string) => {
    if (!selectedTripId || !firestore) return;
    const existing = currentTrip?.customCategories || [];
    const updated = existing.filter((c: string) => c !== catName);
    try {
      await updateDoc(doc(firestore, "trips", selectedTripId), {
        customCategories: updated
      });
      toast({ title: "Category removed" });
    } catch (e) {
      console.error(e);
    }
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
                                    onChange={updateCustomAmount.bind(null, member.id)}
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
          {[1, 2].map(s => (
            <div 
              key={s} 
              className={`h-1.5 w-12 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-muted'}`}
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
                <h1 className="text-2xl font-bold">Details</h1>
                <Select value={selectedTripId} onValueChange={(val) => setSelectedTripId(val)}>
                  <SelectTrigger className="w-auto min-w-[140px] h-10 rounded-2xl border-2 border-primary/10 bg-white text-foreground font-bold text-xs hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm focus:ring-0 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <SelectValue placeholder="Select trip" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-[1.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white p-2">
                    {trips.map(trip => (
                      <SelectItem key={trip.id} value={trip.id} className="rounded-xl text-xs font-bold py-3 focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">
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
                <span className={cn(
                  "absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold transition-colors",
                  formData.amount ? "text-foreground" : "text-muted-foreground/40"
                )}>₹</span>
                <Input 
                  type="number"
                  placeholder={formData.isItemized ? "Total calculated" : "0.00"}
                  className={cn(
                    "h-24 text-4xl font-bold rounded-3xl pl-14 focus-visible:ring-primary shadow-sm bg-white border-none placeholder:text-muted-foreground/40 placeholder:font-medium",
                    formData.isItemized && "bg-muted/50 text-muted-foreground/60 cursor-not-allowed"
                  )}
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  disabled={formData.isItemized}
                />
                <div className="absolute right-6 bottom-4 flex items-center gap-2">
                   <Label htmlFor="itemized-split" className="text-xs font-bold text-muted-foreground/60">Itemized split</Label>
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
                <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-primary/20 space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-bold text-primary">Member split</p>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="select-all-step1" className="text-xs font-bold text-muted-foreground/60">Select all</Label>
                        <Switch 
                          id="select-all-step1" 
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </div>
                    </div>
                    <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
                      <TabsList className="h-8 bg-muted/50 rounded-xl p-0.5">
                        <TabsTrigger value="person" className="text-[10px] px-3 h-7 font-bold rounded-lg">Individual</TabsTrigger>
                        <TabsTrigger value="family" className="text-[10px] px-3 h-7 font-bold rounded-lg">Family</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {renderHierarchicalList(true, viewMode)}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <AlignLeft className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors",
                    formData.description ? "text-foreground" : "text-muted-foreground/40"
                  )} />
                  <Input 
                    placeholder="What was it for?"
                    className="h-16 text-lg rounded-2xl pl-12 pr-4 focus-visible:ring-primary shadow-sm bg-white border-none placeholder:text-muted-foreground/40 placeholder:font-medium"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                  {isAnalyzing && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Calendar className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors z-10",
                      formData.date ? "text-foreground stroke-[2px]" : "text-muted-foreground/40"
                    )} />
                    <Input 
                      type="date"
                      className={cn(
                        "h-14 rounded-2xl pl-10 focus-visible:ring-primary shadow-sm text-sm font-bold bg-white border-none relative",
                        formData.date ? "text-foreground/80" : "text-muted-foreground/40"
                      )}
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <Select 
                    value={formData.paymentType} 
                    onValueChange={val => setFormData(prev => ({ ...prev, paymentType: val }))}
                  >
                    <SelectTrigger className={cn(
                      "h-14 rounded-2xl shadow-sm focus:ring-primary text-sm font-bold bg-white border-none",
                      formData.paymentType ? "text-foreground/80" : "text-muted-foreground/40"
                    )}>
                      <SelectValue placeholder={
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-medium">How did you pay?</span>
                        </div>
                      } />
                    </SelectTrigger>
                    <SelectContent className="rounded-[1.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white p-2">
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.id} value={method.id} className="rounded-xl font-bold py-3 text-xs">
                          <div className="flex items-center gap-2">
                            <method.icon className="h-3.5 w-3.5" />
                            {method.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-sm font-bold text-muted-foreground/70">
                      Category
                    </Label>
                    <Dialog open={isManagingCategories} onOpenChange={setIsManagingCategories}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-medium text-muted-foreground/40 hover:bg-primary/5 hover:text-primary transition-colors">
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-6 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <DialogHeader className="mb-6">
                          <DialogTitle className="text-xl font-bold text-center">Manage categories</DialogTitle>
                          <DialogDescription className="sr-only">Add or remove custom categories for your trip expenses.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            <p className="text-xs font-bold text-muted-foreground/70 mb-3">Custom categories</p>
                            {(currentTrip?.customCategories || []).length > 0 ? currentTrip.customCategories.map((cat: string) => (
                              <div key={cat} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                                <span className="text-sm font-bold text-foreground">{cat}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                                  onClick={() => handleRemoveCustomCategory(cat)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )) : (
                              <p className="text-xs text-center py-6 text-muted-foreground italic bg-muted/10 rounded-2xl">No custom categories added.</p>
                            )}
                          </div>
                          
                          <div className="pt-6 border-t space-y-3">
                            <p className="text-xs font-bold text-muted-foreground/70">Add new</p>
                            <div className="flex gap-3">
                              <Input 
                                placeholder="e.g. Safari, Diving" 
                                className="h-14 rounded-2xl shadow-inner border-none bg-muted/40 font-bold"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddCustomCategory()}
                              />
                              <Button 
                                className="h-14 w-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 shrink-0" 
                                onClick={handleAddCustomCategory}
                              >
                                <Plus className="h-6 w-6" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {categoriesList.slice(0, 11).map((catName) => {
                      const baseCat = DEFAULT_CATEGORIES.find(c => c.name === catName);
                      const Icon = baseCat?.icon || Box;
                      const isSelected = formData.category === catName;
                      return (
                        <Card 
                          key={catName}
                          className={cn(
                            "p-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group",
                            isSelected 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : "border-transparent bg-white shadow-sm hover:border-muted/20"
                          )}
                          onClick={() => setFormData(prev => ({ ...prev, category: catName }))}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-xl flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary text-white" : "text-muted-foreground/50"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={cn(
                            "text-[8px] font-bold text-center leading-tight truncate w-full px-1",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {catName}
                          </span>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-muted-foreground/70">Who paid?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {currentTrip?.participants?.map((p: any) => {
                    const isMe = p.isUser && p.userId === user?.uid;
                    const isSelected = formData.payerId === p.id;
                    return (
                      <Card 
                        key={p.id}
                        className={cn(
                          "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3",
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-white shadow-sm hover:border-muted/20'
                        )}
                        onClick={() => setFormData(prev => ({ ...prev, payerId: p.id, payerName: p.name }))}
                      >
                        <Avatar className="h-8 w-8 shadow-sm">
                          <AvatarImage src={p.avatar} />
                          <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "font-bold text-xs truncate",
                          isSelected ? "text-foreground" : "text-foreground/80"
                        )}>{isMe ? "You" : p.name}</span>
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

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "equal_person", label: "Per person", icon: Users, desc: "Include all members" },
                { id: "equal_family", label: "Per family", icon: Home, desc: "One per family unit" },
                { id: "custom", label: "Custom amount", icon: Calculator, desc: "Specific ₹ per person" },
                { id: "just_me", label: "Just you", icon: User, desc: "100% to you" }
              ].map(mode => {
                const isSelected = formData.splitType === mode.id;
                const isDefault = currentTrip?.defaultSplitType === mode.id;
                
                return (
                  <Card 
                    key={mode.id}
                    className={cn(
                      "relative p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col gap-2 overflow-hidden bg-white shadow-sm",
                      isSelected ? "border-primary bg-primary/5 shadow-md" : "border-transparent hover:border-muted/20",
                      isDefault && !isSelected && "border-accent/30"
                    )}
                    onClick={() => {
                      isSplitTypeManuallyChanged.current = true;
                      setFormData(prev => ({ ...prev, splitType: mode.id }));
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground/50"
                      )}>
                        <mode.icon className="h-5 w-5" />
                      </div>
                      {isSelected && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-7 w-7 p-0 rounded-full transition-all hover:bg-transparent",
                            isDefault ? "text-accent" : "text-primary/20 hover:text-primary"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTripDefaultSplit(mode.id);
                          }}
                        >
                          <Pin className={cn("h-4 w-4", isDefault && "fill-current")} />
                        </Button>
                      )}
                      {!isSelected && isDefault && (
                        <Pin className="h-3 w-3 text-accent/50 fill-current" />
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm tracking-tight text-foreground/90">{mode.label}</p>
                        {isDefault && <div className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 font-medium leading-tight">{mode.desc}</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {(formData.splitType === 'equal_family' || formData.splitType === 'equal_person' || formData.splitType === 'custom') && (
              <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-primary/20 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-primary">Member selection</p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="select-all-step2" className="text-xs font-bold text-muted-foreground/60">Select all</Label>
                    <Switch 
                      id="select-all-step2" 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
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
      </main>

      <footer className="p-safe-pad border-t bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20 shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
        <div className="flex gap-3">
          {step === 1 && (
            <Button 
              variant="outline"
              className="flex-1 h-14 rounded-2xl text-base font-bold border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all"
              onClick={handleSplitLater}
              disabled={isPosting || !formData.amount || !formData.description}
            >
              {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Split later"}
            </Button>
          )}
          <Button 
            className={cn(
              "h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95",
              step === 1 ? "flex-1" : "w-full"
            )}
            onClick={step === 2 ? () => handlePostExpense() : nextStep}
            disabled={isPosting || (step === 1 && !formData.isItemized && !formData.amount)}
          >
            {isPosting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                {step === 1 ? "Choose splitting" : "Post expense"}
                {step === 1 && <ChevronRight className="h-5 w-5" />}
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
