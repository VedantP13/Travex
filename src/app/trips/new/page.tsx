
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
    
    // Create an array of all registered user IDs for efficient filtering
    const participantIds = participants
      .filter(p => p.isUser && p.userId)
      .map(p => p.userId as string);

    const tripData = {
      name: name.trim(),
      date: date.trim() || null,
      participants: participants,
      participantIds: participantIds,
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
          <div className="h-52 sm:h-60 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
             <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
               <svg viewBox="200 200 500 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-64 text-accent drop-shadow-[0_0_30px_rgba(245,166,35,0.2)] transform translate-x-8">
                  <path fill="currentColor" fillRule="evenodd" d="m406.2729,305.04381l6.45,-1.6l2.58,-1.32l4.94,-5.65a2.44,2.44 0 0 1 3.68,2.87l-3.31,5.12c-1.75,2.72 -1.39,2.17 -4.34,3.58c-1.69,0.82 -3.71,1.68 -5.63,2.39l7.52,6.22c3.15,-0.43 6.21,-1 9.31,-1.45c3.55,-0.52 3.62,-0.06 6.23,2l12.22,9.54c3.23,2.85 0.79,5.79 -2.11,5.27l-11.43,-8.08c-2.54,-1.79 -2.09,-1.57 -5.17,-0.41c-3.5,1.32 -7.4,3.15 -11.11,3c-4.54,-0.18 -5.54,-2.82 -8.65,-5.52a26.28,26.28 0 0 1 -4.89,-4.91c-0.77,-1.19 -1.58,-2.16 -2.07,-3.13a3.58,3.58 0 0 1 0,-3.59c1.29,-2.47 2.11,-3.5 5.82,-4.33l-0.04,0zm-31.21,-17.7l0,50.46l3.4,0l7.42,-4.81l-3.94,0l0,-5l21.14,0l-13.74,-15.21l3.7,-3.33l16.75,18.56l20.2,0a2.46,2.46 0 0 1 1.88,0.86l15.74,8.94l13.83,0l0,6.83l-122.48,0l0,-6.83l30.75,0l0,-50.46l-29.21,0a1.94,1.94 0 0 1 -1.94,-1.92a1.28,1.28 0 0 1 0,-0.19a21.91,21.91 0 0 1 2.58,-10.83c13.88,-25.06 46.84,-25.47 61.92,-0.77a21.46,21.46 0 0 1 3,11.79a1.92,1.92 0 0 1 -1.89,1.92l-29.11,0zm10.13,50.47l55.37,0l-11.59,-4.81l-36.36,0l-7.42,4.81zm-1.52,-76.34c4.31,6.23 6.46,14.54 6.56,22l11.94,0c-0.61,-9.13 -10.2,-18.23 -18.5,-22zm-5.66,-2.45a33.86,33.86 0 0 0 -3.66,-0.43l0,24.9l12,0c-0.07,-5.69 -3.61,-21.43 -8.36,-24.47l0.02,0zm-7.55,-0.44a32.94,32.94 0 0 0 -3.61,0.4c-4.82,3.05 -8.29,18.76 -8.41,24.5l12,0l0,-24.9l0.02,0zm-9.25,2.76c-8.36,3.79 -18.08,12.65 -18.71,22.15l12.06,0c0.08,-7.39 2.28,-16 6.62,-22.12l0.03,-0.03zm38.1,31.09a6.26,6.26 0 1 0 6.82,5.64a6.27,6.27 0 0 0 -6.82,-5.64z" />
                  <path transform="rotate(-176.937 427.715 292.906)" fill="white" d="m437.91284,293.49582c-1.42122,1.42117 -3.29235,2.13174 -5.16164,2.13174c-1.32571,0 -2.65215,-0.35742 -3.81844,-1.07208l-10.63037,10.63042l-2.81827,-2.81832l1.40918,-1.40918l-1.50874,-1.50869l1.82079,-1.82089l1.50879,1.50874l0.46281,-0.46281l-2.23274,-2.23274l1.97521,-1.97521l2.23274,2.23274l4.96359,-4.96359c-0.71013,-1.16369 -1.06539,-2.48979 -1.06544,-3.81724l-0.00809,0c0,-1.86924 0.71052,-3.74027 2.13164,-5.1614c1.42161,-1.42142 3.29254,-2.13212 5.16183,-2.13212c1.86924,0 3.74042,0.71071 5.16159,2.13188l0.4157,0.41575c1.42108,1.42108 2.13155,3.29211 2.13155,5.16135l-0.00804,0c-0.0001,1.87449 -0.7082,3.74615 -2.12365,5.16164zm-2.89938,-2.89875c0.62579,-0.62589 0.93867,-1.44603 0.93867,-2.26289l-0.00809,0c0,-0.82177 -0.31008,-1.6422 -0.93014,-2.26226l-0.41575,-0.4157c-0.62021,-0.62026 -1.44063,-0.93053 -2.26246,-0.93053c-0.82187,0 -1.64225,0.31027 -2.2625,0.93053c-0.6204,0.6204 -0.93048,1.44068 -0.93048,2.2625l-0.00809,0c0,0.81686 0.31297,1.637 0.93848,2.2625l0.41575,0.41575c0.62006,0.61997 1.44039,0.93005 2.26236,0.93005c0.82187,0 1.6423,-0.31008 2.26226,-0.92995z" />
               </svg>
             </div>

             <DialogClose className="absolute right-4 top-4 sm:right-6 sm:top-6 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
                <X className="h-5 w-5" />
             </DialogClose>
          </div>

          <div className="p-6 sm:p-8 pt-8 sm:pt-10 space-y-6 sm:space-y-7 text-center">
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
                  <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.87 14.13c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.97l3.69-2.84z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.49 6.13-4.49z" />
                  </svg>
                  Link my account now
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted hover:text-foreground transition-all text-sm px-8"
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
