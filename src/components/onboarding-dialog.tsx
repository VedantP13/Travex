'use client';

import { useState } from "react";
import { X, Plus, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface OnboardingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function OnboardingDialog({ isOpen, onOpenChange, onComplete }: OnboardingDialogProps) {
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!name.trim()) return;
    if (familyMembers.includes(name.trim())) {
      setName("");
      return;
    }
    setFamilyMembers([...familyMembers, name.trim()]);
    setName("");
  };

  const handleRemove = (member: string) => {
    setFamilyMembers(familyMembers.filter(m => m !== member));
  };

  const handleSave = async () => {
    if (!user?.uid || !firestore) return;
    
    setIsSaving(true);
    try {
      if (familyMembers.length > 0) {
        await updateDoc(doc(firestore, "users", user.uid), {
          familyMembers,
          updatedAt: serverTimestamp()
        });
      }
      onComplete();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not save family members" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 [&>button]:hidden">
        <div className="h-48 bg-foreground relative flex flex-col items-center justify-center overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
              {/* Prepared space for manual logo placement */}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Welcome to Travex</h2>
          </div>
          <DialogClose asChild>
            <button className="absolute top-6 right-6 h-8 w-8 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all border-none flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2 text-center">
            <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">Who do you travel with?</DialogTitle>
            <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-2">
              Add the family members or friends you travel with most. We'll auto-fill them for your future trips.
            </DialogDescription>
          </div>

          <div className="space-y-5">
            <div className="flex gap-2">
              <Input 
                placeholder="e.g. Sarah, John" 
                className="h-14 rounded-2xl bg-muted/40 border-none font-semibold shadow-inner focus-visible:ring-primary"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <Button size="icon" className="h-14 w-14 rounded-2xl bg-primary shrink-0 shadow-lg shadow-primary/20" onClick={handleAdd}>
                <Plus className="h-6 w-6" strokeWidth={3} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[44px]">
              {familyMembers.map(m => (
                <Badge key={m} variant="outline" className="pl-4 pr-3 py-2 rounded-full flex items-center gap-2 bg-primary/5 border-primary/20 text-primary font-bold shadow-sm animate-in zoom-in-95 duration-200">
                  <span className="text-xs">{m}</span>
                  <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => handleRemove(m)} />
                </Badge>
              ))}
              {familyMembers.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic font-medium pt-2">No members added yet...</p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base gap-3 shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue to dashboard <ChevronRight className="h-5 w-5" /></>}
            </Button>
            <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-muted-foreground text-xs hover:bg-muted" onClick={() => onOpenChange(false)}>
              I'll add them later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
