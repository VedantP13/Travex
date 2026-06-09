
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
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useTrips } from "@/context/trips-context";
import Link from "next/link";
import { AnimatedCompass } from "@/components/animated-compass";

export default function AddExpenseWizard() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
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
    if (!selectedTripId) return;
    const unsubscribe = onSnapshot(doc(db, "trips", selectedTripId), (snapshot) => {
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
  }, [selectedTripId, formData.payerId]);

  const allTargets = useMemo(() => {
    if (!currentTrip?.participants) return [];
    const targets: { id: string; name: string; parentId: string; type: 'participant' | 'family' }[] = [];
    currentTrip.participants.forEach((p: any) => {
      targets.push({ id: p.id, name: p.name, parentId: p.id, type: 'participant' });
      p.familyMembers?.forEach((fm: string) => {
        targets.push({ id: `${p.id}-${fm}`, name: fm, parentId: p.id, type: 'family' });
      });
    });
    return targets;
  }, [currentTrip]);

  useEffect(() => {
    if (formData.splitType === 'equal_person') {
      setFormData(prev => ({ ...prev, selectedIndividuals: allTargets.map(t => t.id) }));
    } else if (formData.splitType === 'equal_family') {
      setFormData(prev => ({ ...prev, selectedIndividuals: currentTrip?.participants?.map((p: any) => p.id) || [] }));
    } else if (formData.splitType === 'just_me') {
      setFormData(prev => ({ ...prev, selectedIndividuals: [formData.payerId || "p1"] }));
    }
  }, [formData.splitType, allTargets, currentTrip, formData.payerId]);

  const handleDescriptionBlur = async () => {
    if (formData.description.length > 3 && !formData.category) {
      setIsAnalyzing(true);
      try {
        const result = await suggestExpenseCategory({ description: formData.description });
        setFormData(prev => ({ ...prev, category: result.category }));
      } catch (e) {
        console.error("AI categorization failed", e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handlePostExpense = async () => {
    if (!selectedTripId || !formData.amount || !formData.description) return;
    setIsPosting(true);
    try {
      const amount = parseFloat(formData.amount);
      const expenseRef = collection(db, "trips", selectedTripId, "expenses");
      await addDoc(expenseRef, {
        ...formData,
        amount: amount,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "trips", selectedTripId), {
        totalSpent: increment(amount)
      });

      toast({
        title: "Expense posted!",
        description: `Successfully added ₹${amount.toFixed(2)} to ${currentTrip?.name}.`
      });
      router.push(`/trips/${selectedTripId}`);
    } catch (error: any) {
      toast({
        title: "Failed to post",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  const toggleSelection = (targetId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedIndividuals.includes(targetId);
      const newSelection = isSelected 
        ? prev.selectedIndividuals.filter(id => id !== targetId)
        : [...prev.selectedIndividuals, targetId];
      return { ...prev, selectedIndividuals: newSelection };
    });
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
              className={`h-1.5 w-12 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-muted'}`}
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
                  placeholder="0.00"
                  className="h-20 text-4xl font-bold rounded-2xl pl-12 focus-visible:ring-primary shadow-sm"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

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

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Split</h1>
              <p className="text-muted-foreground">Divide ₹{formData.amount || '0.00'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "equal_person", label: "Per person", icon: Users, desc: "Include all members" },
                { id: "equal_family", label: "Per family", icon: Home, desc: "One per family unit" },
                { id: "custom", label: "Custom", icon: PieChart, desc: "Pick individuals" },
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
                  {formData.splitType === 'equal_family' ? "Family selection" : "Active split selection"}
                </p>
                <Badge variant="outline" className="text-[10px]">{formData.selectedIndividuals.length} selected</Badge>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {currentTrip?.participants?.map((p: any) => {
                  const isSelected = formData.selectedIndividuals.includes(p.id);
                  const showAsFamily = formData.splitType === 'equal_family';
                  
                  return (
                    <div key={p.id} className="space-y-2">
                      <div 
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-primary/10 border-primary' : 'bg-muted/30 border-transparent opacity-60'}`}
                        onClick={() => toggleSelection(p.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={p.avatar} />
                          </Avatar>
                          <span className="text-xs font-bold">
                            {showAsFamily ? `${p.name}'s family` : p.name} {p.name === "Marco" ? "(You)" : ""}
                          </span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      
                      {!showAsFamily && p.familyMembers?.length > 0 && (
                        <div className="pl-6 grid grid-cols-1 gap-2">
                          {p.familyMembers.map((fm: string) => {
                            const fmId = `${p.id}-${fm}`;
                            const isFmSelected = formData.selectedIndividuals.includes(fmId);
                            return (
                              <div 
                                key={fmId}
                                className={`flex items-center justify-between p-2 rounded-lg border text-[11px] transition-all cursor-pointer ${isFmSelected ? 'bg-accent/10 border-accent' : 'bg-muted/20 border-transparent opacity-60'}`}
                                onClick={() => toggleSelection(fmId)}
                              >
                                <span className="font-medium text-muted-foreground">{fm}</span>
                                {isFmSelected && <Check className="h-3 w-3 text-accent" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
              <p className="text-muted-foreground">Date, payment, and tags.</p>
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
                    placeholder="e.g. Dining, Travel, Fun"
                    className="h-14 rounded-2xl pl-12 focus-visible:ring-primary shadow-sm"
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  />
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["Dining", "Transport", "Stay", "Shopping"].map(cat => (
                    <Badge 
                      key={cat} 
                      variant={formData.category.includes(cat) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 rounded-full text-[10px] font-bold border-primary/20"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                    >
                      {cat}
                    </Badge>
                  ))}
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
          disabled={isPosting || (step === 1 && (!formData.description || !formData.amount))}
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
