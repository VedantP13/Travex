"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, UserPlus, Lightbulb, Loader2, Calendar as CalendarIcon, User, Users, Home, Search, Sparkles, AlertCircle, CheckCircle2, Archive, ChevronRight, TentTree, History, Check, MapPin } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { getInitials, getAvatarFallbackClasses } from "@/lib/avatar-utils";

type Participant = {
  id: string;
  name: string;
  isUser: boolean;
  userId?: string;
  avatar: string;
  familyMembers: string[];
  suggestedFamily?: string[];
};

export default function CreateTrip() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { trips, loading: tripsLoading } = useTrips();
  
  const [travelMode, setTravelMode] = useState<'solo' | 'group'>('group');
  const [name, setName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);

  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);

  // Status Nudge State
  const [nudgeTrip, setNudgeTrip] = useState<any>(null);
  const [hasInteractedWithNudge, setHasInteractedWithNudge] = useState(false);

  // Reuse Members Nudge State
  const [showReuseDialog, setShowReuseDialog] = useState(false);
  const [hasInteractedWithReuse, setHasInteractedWithReuse] = useState(false);
  const [selectedReuseIds, setSelectedReuseIds] = useState<Set<string>>(new Set());
  const [ignoredReuseIds, setIgnoredReuseIds] = useState<Set<string>>(new Set());
  const [excludedFamilyMembers, setExcludedFamilyMembers] = useState<Record<string, string[]>>({});

  const lastTrip = useMemo(() => {
    return trips.length > 0 ? trips[0] : null;
  }, [trips]);

  // Sync current user's profile to get saved family members
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      if (snap.exists()) setFirestoreProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  // Handle "Me" participant initialization and auto-fill
  useEffect(() => {
    if (!user) return;

    setParticipants(prev => {
      const meExists = prev.find(p => p.isUser && p.userId === user.uid);
      const savedFamily = firestoreProfile?.familyMembers || [];
      const currentAvatar = firestoreProfile?.photoURL || user.photoURL || "";

      if (!meExists) {
        const me: Participant = { 
          id: "me", 
          name: `${user.displayName?.split(' ')[0] || "You"} (You)`, 
          isUser: true, 
          userId: user.uid,
          avatar: currentAvatar, 
          familyMembers: savedFamily
        };
        return [me, ...prev];
      }
      
      // Ensure the "me" avatar and family members stay synced with the profile
      return prev.map(p => {
        if (p.id === "me") {
          return {
            ...p,
            avatar: currentAvatar,
            familyMembers: p.familyMembers.length === 0 && savedFamily.length > 0 ? savedFamily : p.familyMembers
          };
        }
        return p;
      });
    });
  }, [user, firestoreProfile]);

  // Trigger Status Nudge
  useEffect(() => {
    if (tripsLoading || !trips.length || hasInteractedWithNudge) return;

    const endedTrip = trips.find(t => {
      if (t.status !== 'Active' || !t.endDate) return false;
      return new Date(t.endDate) < new Date();
    });

    const anyActive = trips.find(t => t.status === 'Active');

    if (endedTrip || anyActive) {
      setNudgeTrip(endedTrip || anyActive);
    }
  }, [trips, tripsLoading, hasInteractedWithNudge]);

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
        description: status === 'Settled' ? "Dashboard totals updated." : "Adventure organized!"
      });
      setNudgeTrip(null);
      setHasInteractedWithNudge(true);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  const handleReuseMembers = () => {
    if (!lastTrip || !user) return;
    
    const reusedParticipants: Participant[] = lastTrip.participants
      .filter((p: any) => selectedReuseIds.has(p.id) && p.userId !== user.uid)
      .map((p: any) => {
        const excluded = excludedFamilyMembers[p.id] || [];
        return {
          ...p,
          id: Math.random().toString(36).substr(2, 9),
          familyMembers: (p.familyMembers || []).filter((fm: string) => !excluded.includes(fm))
        };
      });

    setParticipants(prev => [...prev, ...reusedParticipants]);
    setShowReuseDialog(false);
    setHasInteractedWithReuse(true);
    toast({ 
      title: "Members added!", 
      description: `Imported ${reusedParticipants.length} travel groups from ${lastTrip.name}.` 
    });
  };

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    const newP: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: newParticipantName.trim(),
      isUser: false,
      avatar: "", // Guests start with empty avatar to trigger initial fallback
      familyMembers: []
    };
    setParticipants([...participants, newP]);
    setNewParticipantName("");
    setFriendSearchResults([]);
  };

  const handleSelectFriend = async (friend: any) => {
    const friendId = friend.friendId;
    
    let familyFromProfile: string[] = [];
    try {
      const friendSnap = await getDoc(doc(firestore!, "users", friendId));
      if (friendSnap.exists()) {
        const friendData = friendSnap.data();
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
      avatar: friend.friendPhoto || "",
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

  const toggleReuseId = (id: string) => {
    setSelectedReuseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ignoreReuseGroup = (id: string) => {
    setIgnoredReuseIds(prev => new Set(prev).add(id));
    setSelectedReuseIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleReuseFamilyMember = (participantId: string, memberName: string) => {
    setExcludedFamilyMembers(prev => {
      const current = prev[participantId] || [];
      if (current.includes(memberName)) {
        return { ...prev, [participantId]: current.filter(m => m !== memberName) };
      } else {
        return { ...prev, [participantId]: [...current, memberName] };
      }
    });
  };

  const handleInputClick = () => {
    if (!hasInteractedWithReuse && lastTrip && lastTrip.participants?.length > 1 && travelMode === 'group') {
      const others = lastTrip.participants.filter((p: any) => p.userId !== user?.uid);
      if (others.length > 0) {
        setSelectedReuseIds(new Set(others.map((p: any) => p.id)));
        setShowReuseDialog(true);
      }
    }
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
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'solo', label: 'Solo', icon: User, desc: 'Just me' },
              { id: 'group', label: 'Group', icon: Users, desc: 'Friends' },
            ].map((mode) => (
              <Card 
                key={mode.id}
                className={cn(
                  "p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center gap-2 text-center shadow-none",
                  travelMode === mode.id ? "border-primary bg-primary/5" : "border-muted/20 bg-white"
                )}
                onClick={() => {
                  setTravelMode(mode.id as any);
                  if (mode.id === 'solo') {
                    setParticipants(prev => prev.filter(p => p.id === 'me').map(p => ({ ...p, familyMembers: [] })));
                  }
                }}
              >
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                  travelMode === mode.id ? "bg-primary text-white" : "text-muted-foreground"
                )}>
                  <mode.icon className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                  <p className={cn("text-sm font-bold", travelMode === mode.id ? "text-primary" : "text-foreground")}>{mode.label}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{mode.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold text-foreground/60 ml-1">Trip name</Label>
          <div className="relative">
            <MapPin className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-all",
              name.trim() ? "text-foreground stroke-[2px]" : "text-muted-foreground/40"
            )} />
            <Input 
              placeholder="e.g. Goa 2024, Europe tour" 
              className="h-14 text-base font-medium rounded-2xl focus-visible:ring-primary shadow-sm bg-white border-2 border-muted/20 pl-12"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
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
                  dateRange ? "text-foreground stroke-[2px]" : "text-muted-foreground/40"
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
            
            <div className="relative">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search friends or add guest..." 
                  className="h-12 rounded-xl shadow-sm bg-white font-semibold border-2 border-muted/20 pl-10"
                  value={newParticipantName}
                  onChange={e => setNewParticipantName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                  onClick={handleInputClick}
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
                          <AvatarFallback className={getAvatarFallbackClasses(friend.friendName)}>{getInitials(friend.friendName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold">{friend.friendName}</span>
                      </div>
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </Card>
              )}
            </div>

            <Alert className="bg-primary/10 border-primary/30 rounded-2xl py-3 shadow-sm">
              <Lightbulb className="h-5 w-5 text-foreground/60" strokeWidth={1.5} />
              <AlertDescription className="text-xs text-foreground/60 font-medium leading-relaxed">
                Add your travel buddies! This helps Travex split costs perfectly by individual person or family later.
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
                            <AvatarFallback className={getAvatarFallbackClasses(headName)}>{getInitials(headName)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-sm tracking-tight block">{familyDisplayName}</span>
                            {hasSuggestions && (
                              <button 
                                onClick={() => importFriendFamily(p.id)}
                                className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors animate-pulse"
                              >
                                <UserPlus className="h-3 w-3" />
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

      {/* REUSE MEMBERS DIALOG */}
      <AlertDialog open={showReuseDialog} onOpenChange={(open) => {
        if (!open) setHasInteractedWithReuse(true);
        setShowReuseDialog(open);
      }}>
        <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-32 bg-foreground relative flex flex-col items-center justify-center shrink-0">
             <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                <History className="h-6 w-6 text-white" />
             </div>
             <p className="text-sm font-bold text-white tracking-tight">Recent Travel Buddies</p>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="space-y-1 text-center">
              <AlertDialogTitle className="text-base font-bold text-foreground leading-tight">
                Reuse groups from <span className="text-primary">{lastTrip?.name}</span>?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] font-medium text-muted-foreground leading-relaxed px-4">
                We found groups from your last adventure. Select who's coming this time.
              </AlertDialogDescription>
            </div>

            <div className="relative">
              <ScrollArea className="h-[300px] w-full pr-4 -mx-2 px-2 scrollbar-thin">
                <div className="space-y-3 py-4">
                  {lastTrip?.participants
                    ?.filter((p: any) => p.userId !== user?.uid && !ignoredReuseIds.has(p.id))
                    ?.map((p: any) => {
                      const isSelected = selectedReuseIds.has(p.id);
                      const headName = p.name.replace(" (You)", "");
                      const familyDisplayName = `${headName}'s family`;
                      const excluded = excludedFamilyMembers[p.id] || [];
                      
                      return (
                        <div 
                          key={p.id}
                          className={cn(
                            "rounded-[1.25rem] border-2 transition-all overflow-hidden relative",
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted/10 bg-muted/5 opacity-60"
                          )}
                        >
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id={`reuse-${p.id}`} 
                                  checked={isSelected} 
                                  onCheckedChange={() => toggleReuseId(p.id)}
                                  className="rounded-md h-4 w-4 border-2"
                                />
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7 border border-white shadow-sm">
                                    <AvatarImage src={p.avatar} />
                                    <AvatarFallback className={getAvatarFallbackClasses(headName)}>{getInitials(headName)}</AvatarFallback>
                                  </Avatar>
                                  <Label htmlFor={`reuse-${p.id}`} className="text-xs font-bold text-foreground cursor-pointer">
                                    {familyDisplayName}
                                  </Label>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  ignoreReuseGroup(p.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="flex flex-wrap gap-1 pl-7">
                              <Badge variant="outline" className="px-2 py-0.5 rounded-lg bg-white border-muted/20 text-[9px] font-semibold text-foreground/70">
                                {headName}
                              </Badge>
                              {p.familyMembers?.filter((fm: string) => !excluded.includes(fm)).map((fm: string) => (
                                <Badge 
                                  key={fm} 
                                  variant="outline" 
                                  className="pl-2 pr-1 py-0.5 rounded-lg bg-white border-primary/20 text-[9px] font-medium text-primary flex items-center gap-1"
                                >
                                  {fm}
                                  <X 
                                    className="h-2.5 w-2.5 cursor-pointer hover:text-destructive" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReuseFamilyMember(p.id, fm);
                                    }}
                                  />
                                </Badge>
                              ))}
                              {excluded.map((fm: string) => (
                                <Badge 
                                  key={fm} 
                                  variant="outline" 
                                  className="px-2 py-0.5 rounded-lg bg-muted/50 border-muted/20 text-[9px] font-medium text-muted-foreground/40 line-through flex items-center gap-1 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleReuseFamilyMember(p.id, fm);
                                  }}
                                >
                                  {fm}
                                  <Plus className="h-2.5 w-2.5" />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
              {/* Fade cues */}
              <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
            </div>

            <div className="grid gap-2 pt-1">
              <Button 
                className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all"
                onClick={handleReuseMembers}
                disabled={selectedReuseIds.size === 0}
              >
                Add selected ({selectedReuseIds.size})
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-9 rounded-xl font-bold text-muted-foreground text-[10px] hover:bg-muted"
                onClick={() => {
                  setShowReuseDialog(false);
                  setHasInteractedWithReuse(true);
                }}
              >
                Add manually
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* STATUS NUDGE DIALOG */}
      <AlertDialog open={!!nudgeTrip && !showReuseDialog} onOpenChange={(open) => !open && setHasInteractedWithNudge(true)}>
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
                  <TentTree className="h-8 w-8 text-accent animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Active Trips found</h2>
             </div>
          </div>

          <div className="p-8 text-center space-y-6">
            <div className="space-y-3">
              <AlertDialogTitle className="text-lg font-bold text-foreground leading-tight">
                Is <span className="text-primary font-bold">{nudgeTrip?.name}</span> still ongoing?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-2">
                Keeping your trips organized ensures your dashboard reflects your true balance. Mark as <span className="text-foreground font-bold">Completed</span> if you're done spending, or <span className="text-foreground font-bold">Settled</span> if all debts are resolved.
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
                className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold text-sm gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-95 transition-all"
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
                    setHasInteractedWithNoun(true);
                  }}
                >
                  Keep journey active & start new trip <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}