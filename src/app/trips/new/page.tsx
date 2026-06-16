
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, UserPlus, Lightbulb, Loader2, Calendar as CalendarIcon, User, Users, Home, Search, Sparkles, AlertCircle, CheckCircle2, Archive, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useAuth } from "@/firebase";
import { collection, doc, setDoc, updateDoc, serverTimestamp, onSnapshot, query, getDocs, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { getDestinationHint } from "@/ai/flows/get-destination-hint";
import { useTrips } from "@/context/trips-context";
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
  suggestedFamily?: string[]; // New: family members found in friend's profile
};

export default function CreateTrip() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { trips, loading: tripsLoading } = useTrips();
  
  const [travelMode, setTravelMode] = useState<'solo' | 'family' | 'group'>('group');
  const [name, setName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);

  // Friend Search states
  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);

  // Active Nudge states
  const [nudgeTrip, setNudgeTrip] = useState<any>(null);
  const [hasInteractedWithNudge, setHasInteractedWithNudge] = useState(false);

  // Listen for persistent family members from profile
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      if (snap.exists()) setFirestoreProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  // Sync family members to "Your family" participant
  useEffect(() => {
    if (!user || !firestoreProfile) return;

    const savedFamily = firestoreProfile.familyMembers || [];

    setParticipants(prev => {
      const meExists = prev.find(p => p.isUser && p.userId === user.uid);
      
      const me: Participant = { 
        id: "me", 
        name: `${user.displayName?.split(' ')[0] || "You"} (You)`, 
        isUser: true, 
        userId: user.uid,
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/50/50`, 
        familyMembers: meExists?.familyMembers?.length ? meExists.familyMembers : savedFamily
      };

      if (!meExists) return [me, ...prev];
      
      return prev.map(p => p.id === "me" ? me : p);
    });
  }, [user, firestoreProfile]);

  // Phase 4 Logic: Check for active trips when entering New Trip flow
  useEffect(() => {
    if (tripsLoading || !trips.length || hasInteractedWithNudge) return;

    // Smart Prioritization:
    // 1. First, look for an Active trip that has already ended (Past Due)
    const endedTrip = trips.find(t => {
      if (t.status !== 'Active' || !t.endDate) return false;
      return new Date(t.endDate) < new Date();
    });

    // 2. Fallback to any active trip
    const anyActive = trips.find(t => t.status === 'Active');

    if (endedTrip || anyActive) {
      setNudgeTrip(endedTrip || anyActive);
    }
  }, [trips, tripsLoading, hasInteractedWithNudge]);

  // Search friends logic
  useEffect(() => {
    const searchFriends = async () => {
      if (!user?.uid || !firestore || newParticipantName.trim().length < 2) {
        setFriendSearchResults([]);
        return;
      }

      setIsSearchingFriends(true);
      try {
        const qry = newParticipantName.toLowerCase();
        const friendsRef = collection(firestore, "users", user.uid, "friends");
        const snap = await getDocs(friendsRef);
        
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((f: any) => 
            f.status === "accepted" && 
            f.friendName.toLowerCase().includes(qry) &&
            !participants.some(p => p.userId === f.friendId)
          );
        
        setFriendSearchResults(results);
      } catch (e) {
        console.error("Friend search failed:", e);
      } finally {
        setIsSearchingFriends(false);
      }
    };

    const timeoutId = setTimeout(searchFriends, 300);
    return () => clearTimeout(timeoutId);
  }, [newParticipantName, user?.uid, firestore, participants]);

  const handleUpdateStatusAndContinue = async (status: 'Completed' | 'Settled') => {
    if (!nudgeTrip || !firestore) return;
    
    try {
      await updateDoc(doc(firestore, "trips", nudgeTrip.id), {
        status,
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: `Trip marked as ${status}`,
        description: status === 'Settled' ? "Dashboard totals updated." : "Organized!"
      });
      setNudgeTrip(null);
      setHasInteractedWithNudge(true);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

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
    setFriendSearchResults([]);
  };

  const handleSelectFriend = async (friend: any) => {
    const friendId = friend.friendId;
    
    // Fetch friend's profile to get their family members
    let familyFromProfile: string[] = [];
    try {
      const friendSnap = await getDoc(doc(firestore!, "users", friendId));
      if (friendSnap.exists()) {
        const friendData = friendSnap.data();
        // Check visibility setting - default to true
        if (friendData.isFamilyPublic !== false) {
          familyFromProfile = friendData.familyMembers || [];
        }
      }
    } catch (e) {
      console.warn("Failed to fetch friend family members:", e);
    }

    const newP: Participant = {
      id: friendId,
      name: friend.friendName,
      isUser: true,
      userId: friendId,
      avatar: friend.friendPhoto || `https://picsum.photos/seed/${friendId}/50/50`,
      familyMembers: [],
      suggestedFamily: familyFromProfile
    };

    setParticipants([...participants, newP]);
    setNewParticipantName("");
    setFriendSearchResults([]);
    
    if (familyFromProfile.length > 0) {
      toast({
        title: `Found ${friend.friendName}'s family`,
        description: `You can instantly add their ${familyFromProfile.length} family members below.`
      });
    }
  };

  const importFriendFamily = (pid: string) => {
    setParticipants(prev => prev.map(p => {
      if (p.id === pid && p.suggestedFamily) {
        // Merge suggested into actual, unique only
        const newMembers = Array.from(new Set([...p.familyMembers, ...p.suggestedFamily]));
        return { ...p, familyMembers: newMembers, suggestedFamily: [] };
      }
      return p;
    }));
    toast({ title: "Family imported!" });
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

    const newTripRef = doc(collection(firestore!, "trips"));
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

    const endDate = dateRange?.to ? dateRange.to.toISOString() : (dateRange?.from ? dateRange.from.toISOString() : null);
    
    const tripData = {
      name: name.trim(),
      date: formattedDate,
      endDate: endDate,
      travelMode,
      participants: participants.map(({ suggestedFamily, ...rest }) => rest),
      participantIds: Array.from(participantIdsSet),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
        
        // Check if we should prompt to save family members to profile
        const myFamily = participants.find(p => p.id === "me")?.familyMembers || [];
        const savedFamily = firestoreProfile?.familyMembers || [];
        const hasNewMembers = myFamily.some(m => !savedFamily.includes(m));

        if (hasNewMembers) {
          toast({
            title: "Save Travel Group?",
            description: "Want to save these family members to your profile for next time?",
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 rounded-lg bg-primary text-white border-none font-bold"
                onClick={async () => {
                  try {
                    const userRef = doc(firestore!, "users", currentUser.uid);
                    await setDoc(userRef, { familyMembers: myFamily }, { merge: true });
                    toast({ title: "Travel group saved!" });
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Save
              </Button>
            ),
          });
        }
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
                  if (mode.id === 'solo') {
                    setParticipants(prev => prev.filter(p => p.id === 'me').map(p => ({ ...p, familyMembers: [] })));
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
              <div className="relative">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search friends or add guest..." 
                    className="h-12 rounded-xl shadow-sm bg-white font-semibold border-2 border-muted/20 pl-10"
                    value={newParticipantName}
                    onChange={e => setNewParticipantName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addParticipant()}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={addParticipant}>
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>

                {friendSearchResults.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-30 mt-2 border-none shadow-2xl bg-white rounded-2xl overflow-hidden divide-y animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 bg-muted/20">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirmed Friends</p>
                    </div>
                    {friendSearchResults.map((friend) => (
                      <div 
                        key={friend.id} 
                        className="p-3 flex items-center justify-between hover:bg-primary/5 cursor-pointer transition-colors"
                        onClick={() => handleSelectFriend(friend)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.friendPhoto} />
                            <AvatarFallback>{friend.friendName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold">{friend.friendName}</span>
                        </div>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    ))}
                  </Card>
                )}
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
                const familyDisplayName = p.isUser && p.id === 'me' ? "Your family" : `${headName}'s family`;
                const hasSuggestions = p.suggestedFamily && p.suggestedFamily.length > 0;

                return (
                  <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback>{headName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-sm tracking-tight block">{familyDisplayName}</span>
                            {hasSuggestions && (
                              <button 
                                onClick={() => importFriendFamily(p.id)}
                                className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors animate-pulse"
                              >
                                <Sparkles className="h-3 w-3 fill-current" />
                                Import saved members ({p.suggestedFamily?.length})
                              </button>
                            )}
                          </div>
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
                              <Plus className="h-3.5 w-3.5" /> Add member
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

      {/* Interstitial Smart Nudge Dialog */}
      <AlertDialog open={!!nudgeTrip} onOpenChange={(open) => !open && setHasInteractedWithNudge(true)}>
        <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-48 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
             <div className="absolute inset-0 opacity-10">
               <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="url(#grad)" />
                 <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="white" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
               </svg>
             </div>
             <div className="relative z-10 flex flex-col items-center text-center px-6">
                <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-accent animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Active adventure found</h2>
             </div>
          </div>

          <div className="p-8 text-center space-y-6">
            <div className="space-y-3">
              <AlertDialogTitle className="text-lg font-bold text-foreground leading-tight">
                Is <span className="text-primary underline underline-offset-4 decoration-2">"{nudgeTrip?.name}"</span> still ongoing?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-2">
                We noticed you have an active trip. Completing finished trips keeps your dashboard totals accurate and hassle-free.
              </AlertDialogDescription>
            </div>

            <div className="grid gap-3 pt-2">
              <Button 
                className="w-full h-12 rounded-xl bg-primary text-white font-bold text-sm gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                onClick={() => handleUpdateStatusAndContinue('Completed')}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Completed
              </Button>
              <Button 
                variant="outline"
                className="w-full h-12 rounded-xl border-2 border-accent/20 text-accent hover:bg-accent/5 font-bold text-sm gap-2"
                onClick={() => handleUpdateStatusAndContinue('Settled')}
              >
                <Archive className="h-4 w-4" />
                Mark as Settled
              </Button>
              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  className="w-full h-10 rounded-xl font-semibold text-muted-foreground text-xs hover:bg-muted"
                  onClick={() => {
                    setNudgeTrip(null);
                    setHasInteractedWithNudge(true);
                  }}
                >
                  It's still ongoing, start new trip <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
