
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronRight, 
  ChevronLeft,
  X,
  Check,
  Loader2,
  Calendar,
  CreditCard,
  Tag,
  Users,
  PieChart,
  User,
  Home,
  MapPin,
  AlignLeft,
  Plus,
  Trash2,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useTrips } from "@/context/trips-context";
import Link from "next/link";
import { AnimatedCompass } from "@/components/animated-compass";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

export default function AddExpenseWizard() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { trips, loading: tripsLoading } = useTrips();
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>((params?.id as string) || "");
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  
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

  // Set default selectedTripId if not provided
  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }
  }, [selectedTripId, trips]);

  // Sync current trip details and set default payer
  useEffect(() => {
    if (!selectedTripId || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, "trips", selectedTripId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentTrip({ id: snapshot.id, ...data });
        if (data.participants?.length > 0 && !formData.payerId) {
          setFormData(prev => ({ 
            ...prev, 
            payerId: data.participants[0].id,
            payerName: data.participants[0].name
          }));
        }
      }
    });
    return () => unsubscribe();
  }, [selectedTripId, formData.payerId, firestore]);

  const allTargets = useMemo(() => {
    if (!currentTrip?.participants) return [];
    const targets: { id: string; name: string; parentId: string; type: 'participant' | 'family'; avatar?: string }[] = [];
    currentTrip.participants.forEach((p: any) => {
      targets.push({ id: p.id, name: p.name, parentId: p.id, type: 'participant', avatar: p.avatar });
      p.familyMembers?.forEach((fm: string) => {
        targets.push({ id: `${p.id}-${fm}`, name: fm, parentId: p.id, type: 'family' });
      });
    });
    return targets;
  }, [currentTrip]);

  useEffect(() => {
    if (formData.isItemized) {
      // Force splitType to custom if itemized
      setFormData(prev => ({ ...prev, splitType: 'custom' }));
    } else {
      // Default reset behavior when toggling itemized OFF
      if (formData.splitType === 'equal_person') {
        setFormData(prev => ({ ...prev, selectedIndividuals: allTargets.map(t => t.id) }));
      } else if (formData.splitType === 'equal_family') {
        setFormData(prev => ({ ...prev, selectedIndividuals: currentTrip?.participants?.map((p: any) => p.id) || [] }));
      } else if (formData.splitType === 'just_me') {
        setFormData(prev => ({ ...prev, selectedIndividuals: [formData.payerId || "p1"] }));
      }
    }
  }, [formData.isItemized, formData.splitType, allTargets, currentTrip, formData.payerId]);

  // Calculate sum of custom amounts
  const customSum = useMemo(() => {
    return Object.values(formData.customAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [formData.customAmounts]);

  // Sync amount if itemized split is active
  useEffect(() => {
    if (formData.isItemized) {
      setFormData(prev => ({ ...prev, amount: customSum.toString() }));
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
      
      // If itemized, skip step 2 (split selection) and go to step 3
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
      setStep(1); // Jump back to 1 if we skipped 2
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handlePostExpense = () => {
    if (!selectedTripId || !formData.amount || !formData.description || !firestore) return;
    
    // Check if custom split matches total if total is known (non-itemized custom split)
    if (formData.splitType === 'custom' && !formData.isItemized) {
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
      createdAt: serverTimestamp(),
    };

    // Non-blocking write
    addDoc(expenseRef, expenseData)
      .then(() => {
        toast({
          title: "Expense posted!",
          description: `Successfully added ₹${amount.toFixed(2)} to ${currentTrip?.name}.`
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

    // Optimistically update trip total
    updateDoc(doc(firestore, "trips", selectedTripId), {
      totalSpent: increment(amount)
    }).catch(() => {});
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

  const updateCustomAmount = (targetId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customAmounts: { ...prev.customAmounts, [targetId]: value }
    }));
  };

  if (tripsLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AnimatedCompass className="h-12 w-12 text-primary" />
        <p className="text-sm font-bold text-muted-foreground">Checking your trips...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
        <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold">Add expense</h1>
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <X className="h-6 w-6" />
          </Button>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-safe-pad">
          <div className="text-center py-14 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 px-10 max-w-sm mx-auto shadow-sm">
            <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Plus className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h2 className="text-lg font-bold text-foreground">No trips found</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6 leading-relaxed">
              You need to create a trip before you can start splitting expenses with friends.
            </p>
            <Link href="/trips/new" className="w-full">
              <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                Create your first trip
              </Button>
            </Link>
          </div>
        </main>
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

      <main className="flex-1 px-safe-pad py-8 overflow-y-auto">
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
                  placeholder={formData.isItemized ? "Calculating total..." : "0.00"}
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
                        splitType: val ? 'custom' : 'equal_person'
                     }))} 
                   />
                </div>
              </div>

              {formData.isItemized && (
                <div className="bg-white p-5 rounded-2xl border border-dashed border-primary/20 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-primary">Enter amount per person</p>
                    <Badge variant="outline" className="text-[10px]">{formData.selectedIndividuals.length} contributors</Badge>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {allTargets.map((target) => {
                      const isSelected = formData.selectedIndividuals.includes(target.id);
                      return (
                        <div 
                          key={target.id} 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-muted/10 border-transparent opacity-50 grayscale-[0.5]'
                          )}
                          onClick={() => toggleSelection(target.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={target.avatar} />
                              <AvatarFallback>{target.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold truncate max-w-[80px]">
                              {target.name} {target.name === "Marco" ? "(You)" : ""}
                            </span>
                          </div>
                          {isSelected ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <span className="text-xs font-bold text-muted-foreground">₹</span>
                              <Input 
                                type="number" 
                                placeholder="0"
                                className="h-9 w-24 rounded-lg text-right font-bold text-sm bg-white"
                                value={formData.customAmounts[target.id] || ""}
                                onChange={e => updateCustomAmount(target.id, e.target.value)}
                              />
                            </div>
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  {currentTrip?.participants?.map((p: any) => (
                    <Card 
                      key={p.id}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${formData.payerId === p.id ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'}`}
                      onClick={() => setFormData(prev => ({ ...prev, payerId: p.id, payerName: p.name }))}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar} />
                        <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-sm truncate">{p.name === "Marco" ? "You" : p.name}</span>
                    </Card>
                  ))}
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

            <div className="bg-white p-5 rounded-2xl border border-dashed border-primary/20 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-primary">
                  {formData.splitType === 'equal_family' ? "Family selection" : "Member split"}
                </p>
                <Badge variant="outline" className="text-[10px]">{formData.selectedIndividuals.length} active</Badge>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {allTargets.map((target) => {
                  const isSelected = formData.selectedIndividuals.includes(target.id);
                  const isCustom = formData.splitType === 'custom';
                  
                  return (
                    <div key={target.id} className="space-y-3">
                      <div 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                          isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-muted/10 border-transparent opacity-50 grayscale-[0.5]'
                        )}
                        onClick={() => toggleSelection(target.id)}
                      >
                        <div className="flex items-center gap-3">
                          {target.type === 'participant' ? (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={target.avatar} />
                              <AvatarFallback>{target.name?.[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                              <User className="h-4 w-4 text-accent" />
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-bold">
                              {target.name} {target.name === "Marco" ? "(You)" : ""}
                            </span>
                          </div>
                        </div>
                        {isSelected && !isCustom && <Check className="h-5 w-5 text-primary" />}
                        {isSelected && isCustom && (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <span className="text-sm font-bold text-muted-foreground">₹</span>
                            <Input 
                              type="number" 
                              placeholder="0"
                              className="h-9 w-24 rounded-lg text-right font-bold text-sm bg-white"
                              value={formData.customAmounts[target.id] || ""}
                              onChange={e => updateCustomAmount(target.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

      <footer className="p-safe-pad border-t bg-white sticky bottom-0 z-10">
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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
              {step === 3 ? "Post expense" : "Next step"}
              {step !== 3 && <ChevronRight className="h-5 w-5" />}
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
