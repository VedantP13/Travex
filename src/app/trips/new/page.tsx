
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, UserPlus, Lightbulb, Loader2, Calendar as CalendarIcon, User, Users, Home } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useAuth } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { getDestinationHint } from "@/ai/flows/get-destination-hint";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

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
  const auth = useAuth();
  const { user } = useUser();
  
  const [travelMode, setTravelMode] = useState<'solo' | 'family' | 'group'>('group');
  const [name, setName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [guestPromptDismissed, setGuestPromptDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;

    setParticipants(prev => {
      if (prev.some(p => p.isUser && p.userId === user.uid)) return prev;

      const me: Participant = { 
        id: "me", 
        name: `${user.displayName?.split(' ')[0] || "You"} (You)`, 
        isUser: true, 
        userId: user.uid,
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/50/50`, 
        familyMembers: [] 
      };

      return [me, ...prev.filter(p => p.id !== "me")];
    });
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
    if (id === "me") return;
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

  const handleSaveTrip = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
       toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
       router.push('/login');
       return;
    }

    if (!name.trim()) {
      toast({
        title: "Missing trip name",
        description: "Please give your trip a name to continue.",
        variant: "destructive"
      });
      return;
    }

    if (travelMode === 'group' && participants.length < 2) {
      toast({
        title: "Missing friends",
        description: "Add at least one friend to split expenses with.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    let finalHint = "travel"; 
    try {
      const { hint } = await getDestinationHint({ tripName: name.trim() });
      if (hint) finalHint = hint;
    } catch (aiError) {
      console.warn("AI destination hint failed. Using default.", aiError);
    }

    const newTripRef = doc(collection(firestore, "trips"));
    const tripId = newTripRef.id;

    const participantIdsSet = new Set<string>();
    participants.forEach(p => {
      if (p.isUser && p.userId) participantIdsSet.add(p.userId);
    });
    participantIdsSet.add(currentUser.uid);

    const formattedDate = dateRange?.from ? (
      dateRange.to 
        ? `${format(dateRange.from, "d MMM")} - ${format(dateRange.to, "d MMM")}` 
        : format(dateRange.from, "d MMM")
    ) : null;
    
    const tripData = {
      name: name.trim(),
      date: formattedDate,
      travelMode,
      participants: participants,
      participantIds: Array.from(participantIdsSet),
      createdAt: serverTimestamp(),
      status: "Active",
      totalSpent: 0,
      yourBalance: 0,
      createdBy: currentUser.uid,
      imageHint: finalHint,
      image: `https://picsum.photos/seed/${Math.random()}/600/400`
    };

    setDoc(newTripRef, tripData)
      .then(() => {
        toast({
          title: "Trip created!",
          description: `${name} has been set up successfully.`,
        });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: `/trips/${tripId}`,
          operation: 'create',
          requestResourceData: tripData
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    
    router.push(`/trips/${tripId}`);
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
          <Label className="text-sm font-semibold text-foreground/60 ml-1">Who's traveling?</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'solo', label: 'Solo', icon: User, desc: 'Just me' },
              { id: 'family', label: 'Family', icon: Home, desc: 'Me & kin' },
              { id: 'group', label: 'Group', icon: Users, desc: 'Friends' },
            ].map((mode) => (
              <Card 
                key={mode.id}
                className={cn(
                  "p-4 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center gap-2 text-center",
                  travelMode === mode.id ? "border-primary bg-primary/5" : "border-muted/20 shadow-sm bg-white"
                )}
                onClick={() => {
                  setTravelMode(mode.id as any);
                  if (mode.id === 'solo' || mode.id === 'family') {
                    setParticipants(prev => prev.filter(p => p.id === 'me'));
                  }
                }}
              >
                <div className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center transition-colors",
                  travelMode === mode.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <mode.icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className={cn("text-xs font-semibold", travelMode === mode.id ? "text-primary" : "text-foreground")}>{mode.label}</p>
                  <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-tighter">{mode.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold text-foreground/60 ml-1">Trip name</Label>
          <Input 
            placeholder="e.g. Goa 2024, Europe tour" 
            className="h-14 text-base font-medium rounded-2xl focus-visible:ring-primary shadow-sm bg-white border-2 border-muted/20"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold text-foreground/60 ml-1">Dates (optional)</Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-14 justify-start text-left font-medium text-base rounded-2xl px-4 border-2 border-muted/20 shadow-sm bg-white hover:bg-muted/50 transition-all",
                  !dateRange && "text-muted-foreground/60"
                )}
              >
                <CalendarIcon className={cn(
                  "mr-4 h-5 w-5 transition-all",
                  dateRange ? "text-foreground stroke-[2px]" : "text-muted-foreground/60"
                )} />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "d MMM")} - {format(dateRange.to, "d MMM")}
                    </>
                  ) : (
                    format(dateRange.from, "d MMM")
                  )
                ) : (
                  <span>Pick your travel window</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[2rem] border-none shadow-2xl overflow-hidden max-w-[calc(100vw-40px)]" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
              />
              <div className="p-4 pt-0 border-t border-muted/10 flex justify-end">
                <Button 
                  size="sm" 
                  className="rounded-xl px-6 font-semibold h-9 bg-primary text-white shadow-lg shadow-primary/20"
                  onClick={() => setIsCalendarOpen(false)}
                >
                  OK
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {travelMode !== 'solo' && (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="text-sm font-semibold text-foreground/60 ml-1">Friends & families</Label>
              <span className="text-[10px] text-primary font-semibold">
                {participants.length} {participants.length === 1 ? 'group' : 'groups'} added
              </span>
            </div>
            
            {travelMode === 'group' && (
              <div className="flex gap-2">
                <Input 
                  placeholder="Who's coming with you?" 
                  className="h-12 rounded-xl shadow-sm bg-white font-semibold border-2 border-muted/20"
                  value={newParticipantName}
                  onChange={e => setNewParticipantName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                />
                <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={addParticipant}>
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>
            )}

            <Alert className="bg-primary/10 border-primary/30 rounded-2xl py-3 shadow-sm">
              <Lightbulb className="h-5 w-5 text-foreground/60" strokeWidth={1.5} />
              <AlertDescription className="text-xs text-foreground/60 font-medium leading-relaxed">
                {travelMode === 'family' 
                  ? "Traveling with your household? Add them below to track individual spending within your family."
                  : "Add your travel buddies! This helps Travex split costs perfectly by individual person or family later."}
              </AlertDescription>
            </Alert>

            <div className="space-y-4 pt-2">
              {participants.map((p) => {
                const headName = p.name.replace(" (You)", "");
                const familyDisplayName = p.isUser ? "Your family" : `${headName}'s family`;

                return (
                  <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback>{headName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm tracking-tight">{familyDisplayName}</span>
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
                            className="px-3 py-1.5 rounded-full flex items-center gap-2 bg-primary/5 border-primary/30 text-primary font-semibold shadow-sm"
                          >
                            <span className="text-[10px] font-semibold">{headName}</span>
                          </Badge>

                          {p.familyMembers.map((fm) => (
                            <Badge 
                              key={fm} 
                              variant="outline" 
                              className="pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2 bg-white border-primary/30 text-primary font-semibold shadow-sm group animate-in zoom-in-95 duration-200"
                            >
                              <span className="text-[10px] font-semibold">{fm}</span>
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
                                className="h-8 text-xs rounded-lg bg-white w-24 sm:w-32 font-medium"
                                value={newFamilyMemberName}
                                onChange={e => setNewFamilyMemberName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addFamilyMember(p.id)}
                                onBlur={() => {
                                  if (!newFamilyMemberName.trim()) setActiveFamilyMemberInput(null);
                                }}
                              />
                              <Button size="sm" className="h-8 px-3 rounded-lg bg-primary font-semibold" onClick={() => addFamilyMember(p.id)}>Add</Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] font-semibold text-primary hover:bg-primary/20 hover:text-primary p-0 px-3 flex items-center gap-1 bg-primary/5 rounded-full transition-colors border border-primary/10"
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
        )}
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
          ) : travelMode === 'solo' ? "Start solo trip" : "Create trip group"}
        </Button>
      </footer>

      <Dialog open={showGuestPrompt} onOpenChange={(open) => {
        setShowGuestPrompt(open);
        if (!open) setGuestPromptDismissed(true);
      }}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-52 sm:h-60 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
             <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
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
                You're in <span className="text-accent font-extrabold tracking-tight">Guest Mode</span>. Link your account to sync your trips across all devices and prevent data loss.
              </DialogDescription>
            </div>

            <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4 flex flex-col items-center">
              <Link href="/login" className="w-full max-w-[280px]">
                <Button className="w-full h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base gap-3 shadow-[0_12px_24px_-8px_rgba(245,166,35,0.3)] transition-all active:scale-95 group">
                  Link my account now
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                className="w-full max-w-[280px] h-12 rounded-2xl font-bold text-foreground hover:bg-muted hover:text-foreground transition-all text-sm px-8"
                onClick={() => {
                  setShowGuestPrompt(false);
                  setGuestPromptDismissed(true);
                }}
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
