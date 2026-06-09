"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  X,
  CreditCard,
  Users,
  PieChart,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { useToast } from "@/hooks/use-toast";

const PARTICIPANTS = [
  { id: "p1", name: "Marco", type: "friend", avatar: "https://picsum.photos/seed/user1/50/50" },
  { id: "p2", name: "Sonia", type: "friend", avatar: "https://picsum.photos/seed/user2/50/50" },
  { id: "p3", name: "Leo", type: "member", avatar: "https://picsum.photos/seed/user3/50/50" },
  { id: "p4", name: "Julie", type: "member", avatar: "https://picsum.photos/seed/user4/50/50" },
];

export default function AddExpenseWizard() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    payerId: "p1",
    splitMode: "equal",
    selectedParticipants: ["p1", "p2", "p3", "p4"]
  });

  const handleDescriptionBlur = async () => {
    if (formData.description.length > 3 && !formData.category) {
      setIsAnalyzing(true);
      try {
        const result = await suggestExpenseCategory({ description: formData.description });
        setFormData(prev => ({ ...prev, category: result.category }));
        toast({
          title: "AI Suggestion",
          description: `Automatically categorized as "${result.category}"`,
        });
      } catch (e) {
        console.error("AI categorization failed", e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col">
      {/* Wizard Header */}
      <header className="px-safe-pad py-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={step === 1 ? () => router.back() : prevStep}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1.5 w-8 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <X className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 px-safe-pad pb-12 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">What's the expense?</h1>
              <p className="text-muted-foreground">Type a short description, let AI handle the rest.</p>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <Input 
                  placeholder="e.g. Scuba diving in Nusa Penida"
                  className="h-16 text-lg rounded-2xl pl-4 pr-12 border-none shadow-sm focus-visible:ring-primary"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  onBlur={handleDescriptionBlur}
                />
                {isAnalyzing ? (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                )}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₹</span>
                <Input 
                  type="number"
                  placeholder="0.00"
                  className="h-16 text-3xl font-bold rounded-2xl pl-10 border-none shadow-sm focus-visible:ring-primary"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              {formData.category && (
                <div className="flex flex-wrap gap-2 animate-in zoom-in-95">
                  <Badge className="px-4 py-2 bg-primary/10 text-primary border-none hover:bg-primary/20 cursor-pointer text-sm font-bold flex items-center gap-2">
                    {formData.category}
                    <X className="h-3 w-3" onClick={() => setFormData(prev => ({ ...prev, category: "" }))} />
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Who paid?</h1>
              <p className="text-muted-foreground">Select the participant who covered the cost.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {PARTICIPANTS.map(p => (
                <Card 
                  key={p.id}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 ${formData.payerId === p.id ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'}`}
                  onClick={() => setFormData(prev => ({ ...prev, payerId: p.id }))}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback>{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-bold text-sm">{p.name === "Marco" ? "You" : p.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{p.type}</p>
                  </div>
                  {formData.payerId === p.id && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">How to split?</h1>
              <p className="text-muted-foreground">Choose a dynamic splitting mode.</p>
            </div>

            <div className="space-y-4">
              {[
                { id: "equal", label: "Split Equally", icon: PieChart, desc: "Everyone pays an equal share" },
                { id: "custom", label: "Custom Shares", icon: Users, desc: "Manually assign weights or amounts" },
                { id: "percentage", label: "Percentage", icon: Sparkles, desc: "Split based on total percentage" }
              ].map(mode => (
                <Card 
                  key={mode.id}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${formData.splitMode === mode.id ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'}`}
                  onClick={() => setFormData(prev => ({ ...prev, splitMode: mode.id }))}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${formData.splitMode === mode.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    <mode.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{mode.label}</p>
                    <p className="text-xs text-muted-foreground">{mode.desc}</p>
                  </div>
                  {formData.splitMode === mode.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </Card>
              ))}
            </div>

            {formData.splitMode === "equal" && (
              <div className="bg-white p-4 rounded-2xl border border-dashed border-primary/30 mt-8">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Splitting with</p>
                <div className="flex flex-wrap gap-3">
                  {PARTICIPANTS.map(p => (
                    <div 
                      key={p.id} 
                      className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all cursor-pointer ${formData.selectedParticipants.includes(p.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-transparent opacity-50'}`}
                      onClick={() => setFormData(prev => {
                        const exists = prev.selectedParticipants.includes(p.id);
                        return {
                          ...prev,
                          selectedParticipants: exists 
                            ? prev.selectedParticipants.filter(id => id !== p.id)
                            : [...prev.selectedParticipants, p.id]
                        };
                      })}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.avatar} />
                      </Avatar>
                      <span className="text-xs font-bold">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="px-safe-pad py-6 border-t bg-white">
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          onClick={step === 3 ? () => router.push(`/trips/${id}`) : nextStep}
          disabled={step === 1 && (!formData.description || !formData.amount)}
        >
          {step === 3 ? "Finish & Post" : "Next Step"}
          {step !== 3 && <ChevronRight className="h-5 w-5" />}
        </Button>
      </footer>
    </div>
  );
}
