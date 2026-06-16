
'use client';

import { useState, useEffect } from "react";
import { 
  X, 
  Calendar as CalendarIcon, 
  Timer, 
  Activity, 
  CheckCircle2, 
  Archive, 
  Search, 
  UserPlus, 
  Plus, 
  Sparkles, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, getDocs, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface EditTripDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trip: any;
  user: any;
}

export function EditTripDialog({ isOpen, onOpenChange, trip, user }: EditTripDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [editName, setEditName] = useState(trip?.name || "");
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>();
  const [editStatus, setEditStatus] = useState(trip?.status || "Active");
  const [editParticipants, setEditParticipants] = useState<any[]>(trip?.participants || []);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  
  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (trip) {
      setEditName(trip.name);
      setEditStatus(trip.status);
      setEditParticipants(trip.participants);
    }
  }, [trip]);

  useEffect(() => {
    const searchFriends = async () => {
      if (!user?.uid || !firestore || !isOpen || newParticipantName.trim().length < 2) {
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
            !editParticipants.some(p => p.userId === f.friendId)
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
  }, [newParticipantName, user?.uid, firestore, isOpen, editParticipants]);

  const handleUpdateTrip = async () => {
    if (!trip?.id || !firestore || !editName.trim()) return;
    setIsSaving(true);
    
    const tripRef = doc(firestore, "trips", trip.id);

    const formattedDate = editDateRange?.from ? (
      editDateRange.to 
        ? `${format(editDateRange.from, "d MMM")} - ${format(editDateRange.to, "d MMM")}` 
        : format(editDateRange.from, "d MMM")
    ) : trip.date;

    const endDate = editDateRange?.to 
      ? editDateRange.to.toISOString() 
      : (editDateRange?.from ? editDateRange.from.toISOString() : (trip.endDate || null));

    const participantIdsSet = new Set<string>();
    editParticipants.forEach(p => {
      if (p.isUser && p.userId) participantIdsSet.add(p.userId);
    });

    const updateData = {
      name: editName.trim(),
      date: formattedDate,
      endDate: endDate,
      status: editStatus,
      participants: editParticipants.map(({ suggestedFamily, ...rest }) => rest),
      participantIds: Array.from(participantIdsSet),
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(tripRef, updateData);
      toast({ title: "Trip updated" });
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Update failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectFriend = async (friend: any) => {
    const friendId = friend.friendId;
    let familyFromProfile: string[] = [];
    try {
      const friendSnap = await getDoc(doc(firestore!, "users", friendId));
      if (friendSnap.exists()) {
        const friendData = friendSnap.data();
        if (friendData.isFamilyPublic !== false) familyFromProfile = friendData.familyMembers || [];
      }
    } catch (e) { console.warn(e); }

    const newP = {
      id: friendId,
      name: friend.friendName,
      isUser: true,
      userId: friendId,
      avatar: friend.friendPhoto || `https://picsum.photos/seed/${friendId}/50/50`,
      familyMembers: [],
      suggestedFamily: familyFromProfile
    };
    setEditParticipants([...editParticipants, newP]);
    setNewParticipantName("");
    setFriendSearchResults([]);
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    const newP = {
      id: Math.random().toString(36).substr(2, 9),
      name: newParticipantName.trim(),
      isUser: false,
      avatar: `https://picsum.photos/seed/${Math.random()}/50/50`,
      familyMembers: []
    };
    setEditParticipants([...editParticipants, newP]);
    setNewParticipantName("");
    setFriendSearchResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-24 bg-foreground relative flex items-center justify-center shrink-0">
          <DialogTitle className="text-xl font-bold text-white relative z-10">Edit trip</DialogTitle>
          <DialogDescription className="sr-only">Update your trip details and participants.</DialogDescription>
          <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trip-name" className="text-sm font-semibold text-foreground/60 ml-1">Trip name</Label>
                <Input 
                  id="trip-name"
                  placeholder="e.g. Goa 2024"
                  className="h-14 rounded-2xl shadow-sm border-2 border-muted/20 bg-white font-semibold text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/60 ml-1">Dates (optional)</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-semibold text-sm rounded-2xl px-4 border-2 border-muted/20 shadow-sm bg-white hover:bg-muted/50 transition-all",
                        !editDateRange && "text-muted-foreground/60"
                      )}
                    >
                      <CalendarIcon className={cn(
                        "mr-4 h-5 w-5 transition-all",
                        editDateRange ? "text-foreground stroke-[2px]" : "text-muted-foreground/60"
                      )} />
                      {editDateRange?.from ? (
                        editDateRange.to ? (
                          <>{format(editDateRange.from, "d MMM")} - {format(editDateRange.to, "d MMM")}</>
                        ) : (
                          format(editDateRange.from, "d MMM")
                        )
                      ) : (
                        <span>{trip?.date || "Update travel dates"}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[2rem] border-none shadow-2xl overflow-hidden max-w-[calc(100vw-40px)]" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={editDateRange?.from}
                      selected={editDateRange}
                      onSelect={setEditDateRange}
                      numberOfMonths={1}
                    />
                    <div className="p-4 pt-0 border-t border-muted/10 flex justify-end">
                      <Button size="sm" className="rounded-xl px-6 font-semibold h-9 bg-primary text-white shadow-lg shadow-primary/20" onClick={() => setIsCalendarOpen(false)}>OK</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/60 ml-1">Trip status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-14 rounded-2xl border-2 border-muted/20 bg-white shadow-sm font-semibold text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="Upcoming"><div className="flex items-center gap-3"><Timer className="h-4 w-4" />Upcoming</div></SelectItem>
                    <SelectItem value="Active"><div className="flex items-center gap-3"><Activity className="h-4 w-4" />Active</div></SelectItem>
                    <SelectItem value="Completed"><div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4" />Completed</div></SelectItem>
                    <SelectItem value="Settled"><div className="flex items-center gap-3"><Archive className="h-4 w-4" />Settled</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-sm font-semibold text-foreground/60 ml-1">Friends & families</Label>
                <span className="text-[10px] text-primary font-semibold">{editParticipants.length} groups added</span>
              </div>
              
              <div className="relative">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search friends..." 
                    className="h-12 rounded-xl shadow-sm bg-white font-semibold text-sm border-2 border-muted/20 pl-10"
                    value={newParticipantName}
                    onChange={e => setNewParticipantName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddParticipant()}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={handleAddParticipant}>
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>
                {friendSearchResults.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-30 mt-2 border-none shadow-2xl bg-white rounded-2xl overflow-hidden divide-y">
                    {friendSearchResults.map((friend) => (
                      <div key={friend.id} className="p-3 flex items-center justify-between hover:bg-primary/5 cursor-pointer" onClick={() => handleSelectFriend(friend)}>
                        <div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={friend.friendPhoto} /><AvatarFallback>{friend.friendName[0]}</AvatarFallback></Avatar><span className="text-sm font-semibold">{friend.friendName}</span></div>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    ))}
                  </Card>
                )}
              </div>

              <div className="space-y-4 pt-2">
                {editParticipants.map((p) => {
                  const isMe = p.isUser && p.userId === user?.uid;
                  return (
                    <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white/50">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar><span className="font-semibold text-sm">{isMe ? "Your family" : `${p.name}'s family`}</span></div>
                          {!isMe && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEditParticipants(prev => prev.filter(part => part.id !== p.id))}><X className="h-4 w-4" /></Button>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="outline" className="px-3 py-1.5 rounded-full bg-primary/5 border-primary/30 text-primary font-semibold text-[10px]">{p.name}</Badge>
                          {p.familyMembers?.map((fm: string) => (
                            <Badge key={fm} variant="outline" className="pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2 bg-white border-primary/30 text-primary font-semibold text-[10px]">
                              {fm}<X className="h-3.5 w-3.5 cursor-pointer" onClick={() => setEditParticipants(prev => prev.map(pt => pt.id === p.id ? { ...pt, familyMembers: pt.familyMembers.filter((m: string) => m !== fm) } : pt))} />
                            </Badge>
                          ))}
                          {activeFamilyMemberInput === p.id ? (
                            <div className="flex gap-1 items-center"><Input autoFocus placeholder="Name..." className="h-8 text-xs w-24" value={newFamilyMemberName} onChange={e => setNewFamilyMemberName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setEditParticipants(prev => prev.map(pt => pt.id === p.id ? { ...pt, familyMembers: [...(pt.familyMembers || []), newFamilyMemberName.trim()] } : pt)), setNewFamilyMemberName(""), setActiveFamilyMemberInput(null))} /><Button size="sm" className="h-8 px-3" onClick={() => (setEditParticipants(prev => prev.map(pt => pt.id === p.id ? { ...pt, familyMembers: [...(pt.familyMembers || []), newFamilyMemberName.trim()] } : pt)), setNewFamilyMemberName(""), setActiveFamilyMemberInput(null))}>Add</Button></div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold text-primary bg-primary/5 rounded-full px-3" onClick={() => setActiveFamilyMemberInput(p.id)}><Plus className="h-3.5 w-3.5 mr-1" />Add member</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Button className="w-full h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base shadow-lg shadow-accent/20" onClick={handleUpdateTrip} disabled={isSaving || !editName.trim()}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
