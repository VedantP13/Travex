
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronRight, 
  ChevronLeft,
  X,
  Check,
  Sparkles,
  Loader2,
  Calendar,
  CreditCard,
  Tag,
  Users,
  PieChart,
  User,
  Home,
  MapPin
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

const TRIPS = [
  { id: "bali-2024", name: "Summer in Bali" },
  { id: "paris-fall", name: "Paris Fashion Week" }
];

const PARTICIPANTS = [
  { id: "p1", name: "Marco", avatar: "https://picsum.photos/seed/user1/50/50", familyMembers: ["Family 1A", "Family 1B"] },
  { id: "p2", name: "Sonia", avatar: "https://picsum.photos/seed/user2/50/50", familyMembers: ["Family 2A"] },
  { id: "p3", name: "Leo", avatar: "https://picsum.photos/seed/user3/50/50", familyMembers: [] },
  { id: "p4", name: "Julie", avatar: "https://picsum.photos/seed/user4/50/50", familyMembers: [] },
];

export default function AddExpenseWizard() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>((params?.id as string) || "bali-2024");
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    payerId: "p1",
    splitType: "equal_person",
    selectedIndividuals: [] as string[],
    date: new Date().toISOString().split('T')[0],
    paymentType: "UPI",
    category: ""
  });

  const currentTrip = useMemo(() => TRIPS.find(t => t.id === selectedTripId), [selectedTripId]);

  const allTargets = useMemo(() => {
    const targets: { id: string; name: string; parentId: string; type: 'participant' | 'family' }[] = [];
    PARTICIPANTS.forEach(p => {
      targets.push({ id: p.id, name: p.name, parentId: p.id, type: 'participant' });
      p.familyMembers.forEach(fm => {
        targets.push({ id: `${p.id}-${fm}`, name: fm, parentId: p.id, type: 'family' });
      });
    });
    return targets;
  }, []);

  useEffect(() => {
    if (formData.splitType === 'equal_person') {
      setFormData(prev => ({ ...prev, selectedIndividuals: allTargets.map(t => t.id) }));
    } else if (formData.splitType === 'equal_family') {
      setFormData(prev => ({ ...prev, selectedIndividuals: PARTICIPANTS.map(p => p.id) }));
    } else if (formData.splitType === 'just_me') {
      setFormData(prev => ({ ...prev, selectedIndividuals: ["p1"] }));
    }
  }, [formData.splitType, allTargets]);

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

  const toggleSelection = (targetId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedIndividuals.includes(targetId);
      const newSelection = isSelected 
        ? prev.selectedIndividuals.filter(id => id !== targetId)
        : [...prev.selectedIndividuals, targetId];
      return { ...prev, selectedIndividuals: newSelection };
    });
  };

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
                    <SelectValue placeholder="Select Trip" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {TRIPS.map(trip => (
                      <SelectItem key={trip.id} value={trip.id} className="text-xs font-bold py-3">
                        {trip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Adding to <span className="text-primary font-bold">{currentTrip?.name}</span>
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
                <Input 
                  placeholder="What was it for?"
                  className="h-16 text-lg rounded-2xl pl-4 pr-12 focus-visible:ring-primary shadow-sm"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  onBlur={handleDescriptionBlur}
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-muted-foreground ml-1">Who paid?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {PARTICIPANTS.map(p => (
                    <Card 
                      key={p.id}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${formData.payerId === p.id ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'}`}
                      onClick={() => setFormData(prev => ({ ...prev, payerId: p.id }))}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar} />
                        <AvatarFallback>{p.name[0]}</AvatarFallback>
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
                {PARTICIPANTS.map(p => {
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
                            {showAsFamily ? `${p.name}'s family` : p.name} {p.name === "Marco" && !showAsFamily ? "(You)" : ""}
                          </span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      
                      {!showAsFamily && p.familyMembers.length > 0 && (
                        <div className="pl-6 grid grid-cols-1 gap-2">
                          {p.familyMembers.map(fm => {
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
                  {isAnalyzing && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
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
          onClick={step === 3 ? () => router.push(`/trips/${selectedTripId}`) : nextStep}
          disabled={step === 1 && (!formData.description || !formData.amount)}
        >
          {step === 3 ? "Post expense" : "Next step"}
          {step !== 3 && <ChevronRight className="h-5 w-5" />}
        </Button>
      </footer>
    </div>
  );
}
