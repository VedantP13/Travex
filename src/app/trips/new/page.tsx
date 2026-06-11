
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, UserPlus, Lightbulb, Loader2, Calendar, ShieldAlert, LogIn, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Participant = {
  id: string;
  name: string;
  isUser: boolean;
  userId?: string;
  avatar: string;
  familyMembers: string[];
};

export default function CreateTrip() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  // Initialize participants with current user
  useEffect(() => {
    if (user && participants.length === 0) {
      setParticipants([
        { 
          id: "me", 
          name: `${user.displayName?.split(' ')[0] || "You"} (You)`, 
          isUser: true, 
          userId: user.uid,
          avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/50/50`, 
          familyMembers: [] 
        }
      ]);
    }

    if (user?.isAnonymous) {
      setShowGuestPrompt(true);
    }
  }, [user]);

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    const newP: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: newParticipantName.trim(),
      isUser: false,
      avatar: `https://picsum.photos/seed/${Math.random()}/50/50`,
      familyMembers: []
    };
    setParticipants([...participants, newP]);
    setNewParticipantName("");
  };

  const removeParticipant = (id: string) => {
    if (id === "me") return; // Keep self
    setParticipants(participants.filter(p => p.id !== id));
  };

  const addFamilyMember = (participantId: string) => {
    if (!newFamilyMemberName.trim()) return;
    setParticipants(participants.map(p => {
      if (p.id === participantId) {
        if (p.familyMembers.includes(newFamilyMemberName.trim())) return p;
        return { ...p, familyMembers: [...p.familyMembers, newFamilyMemberName.trim()] };
      }
      return p;
    }));
    setNewFamilyMemberName("");
    setActiveFamilyMemberInput(null);
  };

  const removeFamilyMember = (participantId: string, memberName: string) => {
    setParticipants(participants.map(p => {
      if (p.id === participantId) {
        return { ...p, familyMembers: p.familyMembers.filter(m => m !== memberName) };
      }
      return p;
    }));
  };

  const handleSaveTrip = () => {
    if (!name.trim()) {
      toast({
        title: "Missing trip name",
        description: "Please give your trip a name to continue.",
        variant: "destructive"
      });
      return;
    }

    if (participants.length < 2) {
      toast({
        title: "Missing friends",
        description: "Add at least one friend to split expenses with.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    const tripRef = collection(firestore, "trips");
    const tripData = {
      name: name.trim(),
      date: date.trim() || null,
      participants: participants,
      createdAt: serverTimestamp(),
      status: "Active",
      totalSpent: 0,
      yourBalance: 0,
      createdBy: user?.uid,
      image: `https://picsum.photos/seed/${Math.random()}/600/400`
    };

    addDoc(tripRef, tripData)
      .then((docRef) => {
        toast({
          title: "Trip created!",
          description: `${name} has been set up successfully.`,
        });
        router.push(`/trips/${docRef.id}`);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: tripRef.path,
          operation: 'create',
          requestResourceData: tripData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsCreating(false);
      });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col pb-24">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Create new trip</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-safe-pad py-8 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <Label className="text-sm font-bold text-muted-foreground ml-1">Trip name</Label>
          <Input 
            placeholder="e.g. Goa 2024, Europe tour" 
            className="h-14 text-lg rounded-2xl focus-visible:ring-primary shadow-sm bg-white"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-bold text-muted-foreground ml-1">Trip date (Optional)</Label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
            <Input 
              type="text"
              placeholder="e.g. July 2024 or 12-15 Aug" 
              className="h-14 text-lg rounded-2xl pl-12 focus-visible:ring-primary shadow-sm bg-white"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <Label className="text-sm font-bold text-muted-foreground ml-1">Friends & families</Label>
            <span className="text-[10px] text-primary font-bold">{participants.length} groups added</span>
          </div>
          
          <div className="flex gap-2">
            <Input 
              placeholder="Who's coming with you?" 
              className="h-12 rounded-xl shadow-sm bg-white"
              value={newParticipantName}
              onChange={e => setNewParticipantName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addParticipant()}
            />
            <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={addParticipant}>
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>

          <Alert className="bg-primary/10 border-primary/30 rounded-2xl py-3 shadow-sm">
            <Lightbulb className="h-5 w-5 text-foreground/60" strokeWidth={1.5} />
            <AlertDescription className="text-xs text-foreground/60 font-medium leading-relaxed">
              Traveling with others? Add their names! This helps Travex split costs perfectly by individual person or family later.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 pt-2">
            {participants.map((p) => {
              const headName = p.name.replace(" (You)", "");
              return (
                <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.avatar} />
                          <AvatarFallback>{headName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm tracking-tight">{headName}&apos;s family</span>
                      </div>
                      {p.id !== "me" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeParticipant(p.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge 
                          variant="outline" 
                          className="px-3 py-1.5 rounded-full flex items-center gap-2 bg-primary/5 border-primary/30 text-primary font-bold shadow-sm"
                        >
                          <span className="text-[10px] font-bold">{headName}</span>
                        </Badge>

                        {p.familyMembers.map((fm) => (
                          <Badge 
                            key={fm} 
                            variant="outline" 
                            className="pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2 bg-white border-primary/30 text-primary font-bold shadow-sm group animate-in zoom-in-95 duration-200"
                          >
                            <span className="text-[10px] font-bold">{fm}</span>
                            <X 
                              className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors" 
                              onClick={() => removeFamilyMember(p.id, fm)} 
                            />
                          </Badge>
                        ))}
                        
                        {activeFamilyMemberInput === p.id ? (
                          <div className="flex gap-1 items-center w-full sm:w-auto animate-in fade-in slide-in-from-top-1">
                            <Input 
                              autoFocus
                              placeholder="Name..." 
                              className="h-8 text-xs rounded-lg bg-white w-24 sm:w-32"
                              value={newFamilyMemberName}
                              onChange={e => setNewFamilyMemberName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addFamilyMember(p.id)}
                              onBlur={() => {
                                if (!newFamilyMemberName.trim()) setActiveFamilyMemberInput(null);
                              }}
                            />
                            <Button size="sm" className="h-8 px-3 rounded-lg bg-primary" onClick={() => addFamilyMember(p.id)}>Add</Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold text-primary hover:bg-primary/20 hover:text-primary p-0 px-3 flex items-center gap-1 bg-primary/5 rounded-full transition-colors border border-primary/10"
                            onClick={() => setActiveFamilyMemberInput(p.id)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add family member
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-safe-pad bg-white border-t z-20">
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          onClick={handleSaveTrip}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Creating...
            </>
          ) : "Create trip group"}
        </Button>
      </footer>

      <Dialog open={showGuestPrompt} onOpenChange={setShowGuestPrompt}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-44 sm:h-52 bg-foreground relative flex flex-col items-center justify-center overflow-hidden pt-6">
             <div className="absolute h-48 w-48 bg-accent/20 rounded-full blur-[70px] animate-pulse" />
             
             <div className="relative z-10 flex items-center justify-center">
               <div className="absolute h-28 w-28 rounded-full border border-accent/20 animate-ping duration-[3.5s]" />
               <div className="absolute h-24 w-24 rounded-full border border-accent/30 animate-ping duration-[4.5s]" />
               <div className="h-20 w-20 bg-accent/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-accent shadow-[0_0_50px_rgba(245,166,35,0.25)] border border-accent/20">
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="9" r="7" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M4 18L9 11L14 18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 18L14 9L19 18" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="9" y="8" width="6" height="5" rx="1" fill="#112240" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 8V6C10 4.89543 10.8954 4 12 4C13.1046 4 14 4.89543 14 6V8" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="20" cy="6" r="0.5" fill="#CBD5E1" />
                    <circle cx="5" cy="11" r="0.5" fill="#94A3B8" />
                 </svg>
               </div>
             </div>

             <DialogClose className="absolute right-4 top-4 sm:right-6 sm:top-6 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
                <X className="h-5 w-5" />
             </DialogClose>
          </div>

          <div className="p-6 sm:p-8 pt-8 sm:pt-12 space-y-6 sm:space-y-7 text-center">
            <div className="space-y-3 sm:space-y-4">
              <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Secure your adventure
              </DialogTitle>
              <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-2 sm:px-4">
                You&apos;re in <span className="text-accent font-extrabold tracking-tight">Guest Mode</span>. Link your account to sync your trips across all devices and prevent data loss.
              </DialogDescription>
            </div>

            <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4 flex flex-col items-center">
              <Link href="/login" className="w-full max-w-[280px]">
                <Button className="w-full h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base gap-3 shadow-[0_12px_24px_-8px_rgba(245,166,35,0.3)] transition-all active:scale-95 group">
                  <div className="bg-white p-1 rounded-full border border-white/20 flex items-center justify-center">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-4 w-4" alt="Google" />
                  </div>
                  Link my account now
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted hover:text-primary transition-all text-sm px-8"
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
