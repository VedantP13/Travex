"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings, 
  Search, 
  Filter, 
  ChevronRight, 
  Utensils, 
  Car, 
  ShoppingBag, 
  Home, 
  MoreVertical,
  Plus,
  Loader2,
  Clock,
  Trash2,
  Pencil,
  Calendar as CalendarIcon,
  X,
  AlertTriangle,
  UserPlus,
  ImageIcon,
  Upload,
  Camera,
  CheckCircle2,
  Activity,
  Timer,
  AlertCircle,
  Plane,
  Box,
  Sparkles,
  Archive,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight,
  ChevronDown,
  CreditCard,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc, serverTimestamp, getDocs, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { getTripImage } from "@/lib/image-utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

export default function TripDetails() {
  const router = useRouter();
  const { id } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<any>(null);
  
  const [editName, setEditName] = useState("");
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>();
  const [editStatus, setEditStatus] = useState("Active");
  const [editParticipants, setEditParticipants] = useState<any[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  
  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedCoverImage, setStagedCoverImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !firestore) return;

    const tripUnsubscribe = onSnapshot(doc(firestore, "trips", id as string), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrip({ id: snapshot.id, ...data });
        setEditName(data.name || "");
        setEditStatus(data.status || "Active");
        setEditParticipants(data.participants || []);
      } else {
        router.push('/');
      }
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: `trips/${id}`,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    const expensesQuery = query(
      collection(firestore, "trips", id as string, "expenses"),
      orderBy("createdAt", "desc")
    );
    const expensesUnsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const expenseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(expenseData);
      setLoading(false);
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: `trips/${id}/expenses`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
      tripUnsubscribe();
      expensesUnsubscribe();
    };
  }, [id, firestore, router]);

  // Friend Search logic for Edit Dialog
  useEffect(() => {
    const searchFriends = async () => {
      if (!user?.uid || !firestore || !isEditDialogOpen || newParticipantName.trim().length < 2) {
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
  }, [newParticipantName, user?.uid, firestore, isEditDialogOpen, editParticipants]);

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

  const importFriendFamily = (pid: string) => {
    setEditParticipants(prev => prev.map(p => {
      if (p.id === pid && p.suggestedFamily) {
        const newMembers = Array.from(new Set([...p.familyMembers, ...p.suggestedFamily]));
        return { ...p, familyMembers: newMembers, suggestedFamily: [] };
      }
      return p;
    }));
    toast({ title: "Family imported!" });
  };

  const handleRemoveParticipant = (pid: string) => {
    const p = editParticipants.find(part => part.id === pid);
    if (p?.isUser && p.userId === user?.uid) {
      toast({ title: "Cannot remove yourself", variant: "destructive" });
      return;
    }
    setEditParticipants(editParticipants.filter(part => part.id !== pid));
  };

  const handleAddFamilyMember = (pid: string) => {
    if (!newFamilyMemberName.trim()) return;
    setEditParticipants(editParticipants.map(p => {
      if (p.id === pid) {
        if (p.familyMembers.includes(newFamilyMemberName.trim())) return p;
        return { ...p, familyMembers: [...p.familyMembers, newFamilyMemberName.trim()] };
      }
      return p;
    }));
    setNewFamilyMemberName("");
    setActiveFamilyMemberInput(null);
  };

  const handleRemoveFamilyMember = (pid: string, memberName: string) => {
    setEditParticipants(editParticipants.map(p => {
      if (p.id === pid) {
        return { ...p, familyMembers: p.familyMembers.filter((m: string) => m !== memberName) };
      }
      return p;
    }));
  };

  const handleUpdateImage = async () => {
    if (!id || !firestore || !stagedCoverImage) return;
    setIsUploading(true);
    
    const tripRef = doc(firestore, "trips", id as string);
    updateDoc(tripRef, { image: stagedCoverImage, updatedAt: serverTimestamp() })
      .then(() => {
        toast({ title: "Cover updated" });
        setIsImagePickerOpen(false);
        setStagedCoverImage(null);
      })
      .catch(err => {
        console.error(err);
        toast({ title: "Failed to update cover", variant: "destructive" });
      })
      .finally(() => setIsUploading(false));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStagedCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateTrip = async () => {
    if (!id || !firestore || !editName.trim()) return;
    setIsSaving(true);
    
    const tripRef = doc(firestore, "trips", id as string);

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

    updateDoc(tripRef, updateData)
      .then(() => {
        toast({ title: "Trip updated" });
        setIsEditDialogOpen(false);
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: tripRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !firestore) return;
    const tripRef = doc(firestore, "trips", id as string);
    
    updateDoc(tripRef, { 
      status: newStatus,
      updatedAt: serverTimestamp() 
    }).then(() => {
      toast({ 
        title: `Trip marked as ${newStatus}`,
        description: newStatus === 'Settled' ? 'This trip will no longer impact your dashboard totals.' : undefined
      });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: tripRef.path,
        operation: 'update',
        requestResourceData: { status: newStatus }
      }));
    });
  };

  const handleDeleteTrip = async () => {
    if (!id || !firestore) return;
    setIsDeleting(true);
    
    const tripRef = doc(firestore, "trips", id as string);
    deleteDoc(tripRef)
      .then(() => {
        toast({ title: "Trip deleted", description: "All trip data has been removed." });
        router.push('/');
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: tripRef.path,
          operation: 'delete',
        }));
        setIsDeleting(false);
      });
  };

  const groupedStandings = useMemo(() => {
    if (!trip?.participants || !trip?.netBalances) return [];

    return trip.participants.map((p: any) => {
      const isMe = p.isUser && p.userId === user?.uid;
      const headName = p.name.replace(" (You)", "");
      let total = trip.netBalances[p.id] || 0;
      const breakdown = [{ name: headName, balance: trip.netBalances[p.id] || 0 }];

      p.familyMembers?.forEach((fm: string) => {
        const val = trip.netBalances[`${p.id}-${fm}`] || 0;
        total += val;
        breakdown.push({ name: fm, balance: val });
      });

      return {
        id: p.id,
        name: headName,
        isMe,
        avatar: p.avatar,
        isUser: p.isUser,
        userId: p.userId,
        netTotal: total,
        breakdown,
        familyCount: (p.familyMembers?.length || 0) + 1
      };
    }).sort((a: any, b: any) => b.netTotal - a.netTotal);
  }, [trip?.participants, trip?.netBalances, user?.uid]);

  // Suggested Payments Logic
  const suggestedPayments = useMemo(() => {
    if (groupedStandings.length === 0) return [];

    const debtors = groupedStandings
      .filter(s => s.netTotal < -0.01)
      .map(s => ({ name: s.name, avatar: s.avatar, balance: Math.abs(s.netTotal) }));
    
    const creditors = groupedStandings
      .filter(s => s.netTotal > 0.01)
      .map(s => ({ name: s.name, avatar: s.avatar, balance: s.netTotal }));

    const transactions: any[] = [];
    let dIdx = 0;
    let cIdx = 0;

    const dList = JSON.parse(JSON.stringify(debtors));
    const cList = JSON.parse(JSON.stringify(creditors));

    while (dIdx < dList.length && cIdx < cList.length) {
      const d = dList[dIdx];
      const c = cList[cIdx];
      const amount = Math.min(d.balance, c.balance);

      transactions.push({
        from: d.name,
        fromAvatar: d.avatar,
        to: c.name,
        toAvatar: c.avatar,
        amount: amount
      });

      d.balance -= amount;
      c.balance -= amount;

      if (d.balance < 0.01) dIdx++;
      if (c.balance < 0.01) cIdx++;
    }

    return transactions;
  }, [groupedStandings]);

  const isPastDue = useMemo(() => {
    if (!trip || trip.status !== 'Active' || !trip.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(trip.endDate);
    return end < today;
  }, [trip]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Food': return Utensils;
      case 'Transport': return Car;
      case 'Stay': return Home;
      case 'Shopping': return ShoppingBag;
      case 'Flights': return Plane;
      case 'Sightseeing': return Camera;
      default: return Box;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Food': return 'bg-orange-100 text-orange-600';
      case 'Transport': return 'bg-blue-100 text-blue-600';
      case 'Stay': return 'bg-purple-100 text-purple-600';
      case 'Shopping': return 'bg-pink-100 text-pink-600';
      case 'Flights': return 'bg-indigo-100 text-indigo-600';
      case 'Sightseeing': return 'bg-green-100 text-green-600';
      default: return 'bg-teal-100 text-teal-600';
    }
  };

  const unsplitExpenses = expenses.filter(e => e.splitType === 'unsplit');
  const finalizedExpenses = expenses.filter(e => e.splitType !== 'unsplit');

  const selectedExpenseSplits = useMemo(() => {
    if (!selectedExpenseDetail || !trip?.participants) return [];
    
    const amount = parseFloat(selectedExpenseDetail.amount);
    const splits: any[] = [];
    const participantsFlat: any[] = [];

    // Flatten participants for ID matching
    trip.participants.forEach((p: any) => {
      participantsFlat.push({ id: p.id, name: p.name, avatar: p.avatar });
      p.familyMembers?.forEach((fm: string) => {
        participantsFlat.push({ id: `${p.id}-${fm}`, name: fm, avatar: p.avatar });
      });
    });

    const selected = selectedExpenseDetail.selectedIndividuals || [];

    if (selectedExpenseDetail.splitType === 'custom') {
      Object.entries(selectedExpenseDetail.customAmounts || {}).forEach(([id, val]: [string, any]) => {
        const p = participantsFlat.find(pf => pf.id === id);
        if (p) splits.push({ ...p, share: parseFloat(val) });
      });
    } else if (selectedExpenseDetail.splitType === 'equal_person') {
      const share = amount / selected.length;
      selected.forEach((id: string) => {
        const p = participantsFlat.find(pf => pf.id === id);
        if (p) splits.push({ ...p, share });
      });
    } else if (selectedExpenseDetail.splitType === 'equal_family') {
      const familyIds = Array.from(new Set(selected.map((id: string) => id.split('-')[0])));
      const sharePerFamily = amount / familyIds.length;
      familyIds.forEach((fid: any) => {
        const p = participantsFlat.find(pf => pf.id === fid);
        if (p) splits.push({ ...p, share: sharePerFamily, isFamilyGroup: true });
      });
    } else if (selectedExpenseDetail.splitType === 'just_me') {
      const p = participantsFlat.find(pf => pf.id === selectedExpenseDetail.payerId);
      if (p) splits.push({ ...p, share: amount });
    }

    return splits.sort((a, b) => b.share - a.share);
  }, [selectedExpenseDetail, trip?.participants]);

  if (loading && !trip) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col pb-32">
      <div className="relative h-[280px] w-full overflow-hidden shrink-0 rounded-b-[2.5rem] shadow-xl shadow-black/10">
        <img 
          src={getTripImage(trip?.name || "", trip?.image, trip?.imageHint)} 
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" 
          alt={trip?.name}
          data-ai-hint={trip?.imageHint || "travel landscape"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        <div className="absolute top-6 left-safe-pad right-safe-pad flex justify-between items-center z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')} 
            className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-2xl h-11 w-11 border border-white/10 shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-2xl h-11 w-11 border border-white/10 shadow-lg transition-all active:scale-95"
              >
                <Settings className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px] p-1 shadow-[0_10px_40px_rgba(0,0,0,0.15)] border-none bg-white">
              <DropdownMenuItem 
                className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-primary focus:bg-primary/10 focus:text-primary active:scale-[0.98] transition-all"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                  <Pencil className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">Edit details</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 mx-3 bg-muted/30" />
              <DropdownMenuItem 
                className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground active:scale-[0.98] transition-all"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <div className="h-8 w-8 rounded-full bg-destructive/10 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">Delete trip</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            setStagedCoverImage(trip?.image || null);
            setIsImagePickerOpen(true);
          }}
          className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-xl h-9 w-9 border border-white/10 shadow-lg z-10 transition-all active:scale-95"
          title="Change cover"
        >
          <Camera className="h-5 w-5" strokeWidth={2.5} />
        </Button>

        <div className="absolute bottom-6 left-safe-pad right-safe-pad space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3">
            <Badge className={cn(
              "backdrop-blur-md text-white/80 border border-white/10 text-[10px] font-medium px-3 py-1 rounded-lg",
              trip?.status === 'Active' ? 'bg-white/10' : trip?.status === 'Completed' ? 'bg-green-500/40' : trip?.status === 'Settled' ? 'bg-white/5 opacity-60' : 'bg-white/5'
            )}>
              {trip?.status || "Active"}
            </Badge>
            <span className={cn(
              "text-[10px] font-semibold flex items-center gap-1.5",
              trip?.date ? "text-white" : "text-white/60"
            )}>
              <CalendarIcon className={cn("h-3 w-3", trip?.date && "stroke-[3px]")} />
              {trip?.date || "Flexible dates"}
            </span>
          </div>
          
          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-sm">{trip?.name}</h1>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {trip?.participants?.slice(0, 4).map((p: any, idx: number) => (
                <Avatar key={idx} className="h-6 w-6 border-2 border-white shadow-lg">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback className="text-[8px] font-bold bg-white/10 text-white">{p.name?.[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-[10px] font-semibold text-white/80">
              {trip?.participants?.length} participants
            </span>
          </div>
        </div>
      </div>

      <div className="px-safe-pad pt-8 flex-1">
        {isPastDue && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <Alert className="bg-primary/5 border-primary/20 rounded-2xl flex items-center justify-between py-4 shadow-sm">
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">Trip ended on {trip.date?.split('-')[1] || trip.date}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Mark this adventure as completed?</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="rounded-xl bg-primary text-white font-bold h-8 text-[10px] px-3 shadow-md active:scale-95 transition-all"
                onClick={() => handleUpdateStatus('Completed')}
              >
                Mark Done
              </Button>
            </Alert>
          </div>
        )}

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white p-1.5 rounded-2xl shadow-inner border border-muted/20">
            <TabsTrigger 
              value="feed" 
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted/50 font-semibold text-sm transition-all"
            >
              Trip feed
            </TabsTrigger>
            <TabsTrigger 
              value="balances" 
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted/50 font-semibold text-sm transition-all"
            >
              Balances
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-6">
            <div className="space-y-4 pb-24">
              {unsplitExpenses.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 px-1">
                    <Timer className="h-4 w-4 text-accent" />
                    <h2 className="text-xs font-semibold text-accent tracking-widest uppercase">Pending tasks</h2>
                  </div>
                  {unsplitExpenses.map(item => {
                    const Icon = getCategoryIcon(item.category);
                    return (
                      <Card key={item.id} className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedExpenseDetail(item)}>
                            <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-foreground leading-none mb-1">₹{parseFloat(item.amount || 0).toFixed(2)}</h3>
                              <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[140px]">
                                {item.description} • {item.date}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="rounded-full bg-accent text-accent-foreground font-bold text-xs h-9 px-4 hover:scale-105 transition-all shadow-md shadow-accent/20"
                            onClick={() => router.push(`/trips/${id}/expenses/${item.id}/split`)}
                          >
                            Split Now
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <div className="h-px bg-muted/30 mx-2 my-4" />
                </div>
              )}

              {finalizedExpenses.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xs font-semibold text-foreground/60 tracking-widest px-1 uppercase">Expenses</h2>
                  {finalizedExpenses.map(item => {
                    const Icon = getCategoryIcon(item.category);
                    return (
                      <div 
                        key={item.id} 
                        className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center gap-5 group hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                        onClick={() => setSelectedExpenseDetail(item)}
                      >
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", getCategoryColor(item.category))}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate text-foreground">{item.description}</h3>
                          <p className="text-[10px] font-medium text-muted-foreground">Paid by {item.payerName?.split(' ')[0]} • {item.date}</p>
                        </div>
                        <p className="font-semibold text-base tracking-tight text-foreground">₹{parseFloat(item.amount || 0).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && expenses.length === 0 && (
                <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 px-8">
                  <div className="h-14 w-14 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No expenses yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Tap the + button to add your first transaction.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="balances" className="mt-6 space-y-6 pb-24">
            {groupedStandings.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-primary/5">
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Owed</span>
                    </div>
                    <p className="text-lg font-bold">₹{groupedStandings.reduce((acc, s) => s.netTotal > 0 ? acc + s.netTotal : acc, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-destructive/5">
                    <div className="flex items-center gap-1.5 text-destructive mb-1">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Debt</span>
                    </div>
                    <p className="text-lg font-bold">₹{Math.abs(groupedStandings.reduce((acc, s) => s.netTotal < 0 ? acc + s.netTotal : acc, 0)).toFixed(2)}</p>
                  </div>
                </div>

                {/* Suggested Payments Card */}
                {suggestedPayments.length > 0 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <h2 className="text-xs font-semibold text-accent tracking-widest px-1 uppercase">How to settle up</h2>
                    <Card className="border-none shadow-xl bg-accent/5 rounded-[2rem] overflow-hidden border-2 border-dashed border-accent/20">
                      <CardContent className="p-6 space-y-4">
                        {suggestedPayments.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white shadow-sm">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Avatar className="h-8 w-8 border shadow-sm">
                                <AvatarImage src={p.fromAvatar} />
                                <AvatarFallback className="text-[10px] font-bold">{p.from[0]}</AvatarFallback>
                              </Avatar>
                              <p className="text-xs font-bold truncate">{p.from.split(' ')[0]}</p>
                            </div>
                            
                            <div className="flex flex-col items-center gap-1 shrink-0">
                               <p className="text-[10px] font-extrabold text-accent">₹{p.amount.toFixed(0)}</p>
                               <ArrowRight className="h-3 w-3 text-accent/40" strokeWidth={3} />
                            </div>

                            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                              <p className="text-xs font-bold truncate">{p.to.split(' ')[0]}</p>
                              <Avatar className="h-8 w-8 border shadow-sm">
                                <AvatarImage src={p.toAvatar} />
                                <AvatarFallback className="text-[10px] font-bold">{p.to[0]}</AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        ))}
                        <p className="text-[9px] text-center text-muted-foreground/60 font-medium px-4">
                          Follow these transfers to bring everyone's balance to zero efficiently.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <h2 className="text-xs font-semibold text-foreground/60 tracking-widest px-1 uppercase mb-2">Net standing</h2>
                <div className="grid gap-3">
                  {groupedStandings.map((standing) => {
                    const isPositive = standing.netTotal > 0.01;
                    const isNegative = standing.netTotal < -0.01;
                    const isZero = !isPositive && !isNegative;
                    
                    const familyDisplayName = standing.isMe 
                      ? "Your family" 
                      : `${standing.name}'s family`;

                    return (
                      <Card key={standing.id} className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden group hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="h-14 w-14 border-2 border-white shadow-md shrink-0">
                                  <AvatarImage src={standing.avatar} className="object-cover" />
                                  <AvatarFallback className="bg-muted text-foreground font-bold">{standing.name[0]}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-base truncate text-foreground">{familyDisplayName}</h3>
                                <p className={cn(
                                  "text-[10px] font-extrabold uppercase tracking-widest mt-0.5 flex items-center gap-1",
                                  isPositive ? "text-primary" : isNegative ? "text-accent" : "text-muted-foreground"
                                )}>
                                  {isPositive ? <TrendingDown className="h-3 w-3" /> : isNegative ? <TrendingUp className="h-3 w-3" /> : null}
                                  {isPositive ? 'Is owed' : isNegative ? 'Owes' : 'Perfectly settled'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <p className={cn(
                                "text-lg font-black tracking-tight",
                                isPositive ? "text-primary" : isZero ? "text-muted-foreground" : "text-foreground"
                              )}>
                                {isZero ? '—' : `₹${Math.abs(standing.netTotal).toFixed(2)}`}
                              </p>
                              {standing.familyCount > 1 && (
                                <p className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                                  {standing.familyCount} members
                                </p>
                              )}
                            </div>
                          </div>

                          {standing.familyCount > 1 && (
                            <Accordion type="single" collapsible className="border-t border-muted/20">
                              <AccordionItem value="breakdown" className="border-none">
                                <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/10 group">
                                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest group-hover:text-primary transition-colors">
                                    View breakdown
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent className="px-5 pb-5">
                                  <div className="space-y-3 pt-1">
                                    {standing.breakdown.map((b: any, idx: number) => {
                                      const bPos = b.balance > 0.01;
                                      const bNeg = b.balance < -0.01;
                                      return (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                          <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                                            <span className="font-semibold text-foreground/80">{b.name}</span>
                                          </div>
                                          <span className={cn(
                                            "font-bold",
                                            bPos ? "text-primary" : bNeg ? "text-accent" : "text-muted-foreground/40"
                                          )}>
                                            {bPos ? '+' : bNeg ? '-' : ''}₹{Math.abs(b.balance).toFixed(0)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-8 bg-muted/20 rounded-3xl p-5 border border-dashed border-muted/50">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                      Calculations are optimized for simplicity. The primary family leader is responsible for coordinating payments for their unit.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/50 px-10">
                 <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Activity className="h-7 w-7 text-primary/40" />
                 </div>
                 <h3 className="text-lg font-bold text-foreground tracking-tight">Balance summaries</h3>
                 <p className="text-sm text-muted-foreground mt-1 leading-relaxed px-4">Calculated debt and credit standings will appear as you finalize expense splits.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="fixed bottom-10 right-8 z-30">
        <Button 
          size="lg" 
          className="rounded-full h-16 w-16 shadow-2xl shadow-accent/40 bg-accent hover:bg-accent/90 p-0 transition-transform hover:scale-110 active:scale-95 group"
          onClick={() => router.push(`/trips/${id}/add`)}
        >
          <Plus className="h-10 w-10 transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} />
        </Button>
      </div>

      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-24 bg-foreground relative flex items-center justify-center shrink-0">
            <DialogTitle className="text-xl font-bold text-white relative z-10">Change cover</DialogTitle>
            <DialogDescription className="sr-only">Choose a predefined image or upload your own.</DialogDescription>
            <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-6">
              {stagedCoverImage && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/60 ml-1">Preview</Label>
                  <div className="h-32 w-full rounded-2xl overflow-hidden shadow-md border-4 border-white">
                    <img src={stagedCoverImage} className="h-full w-full object-cover" alt="Preview" />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/60 ml-1">Upload custom image</Label>
                <div 
                  onClick={() => imageInputRef.current?.click()}
                  className="h-28 w-full rounded-2xl border-2 border-dashed border-primary/20 bg-white flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-primary/5 transition-all shadow-sm group"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold">Pick from device</span>
                  <input 
                    type="file" 
                    ref={imageInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </div>
              </div>

              <div className="space-y-3 pb-4">
                <Label className="text-sm font-semibold text-foreground/60 ml-1">Predefined styles</Label>
                <div className="grid grid-cols-2 gap-3">
                   {PlaceHolderImages.filter(img => img.id.startsWith('trip-')).map((img) => (
                     <div 
                       key={img.id}
                       className={cn(
                         "relative aspect-video rounded-2xl overflow-hidden cursor-pointer group shadow-sm border-2 transition-all",
                         stagedCoverImage === img.imageUrl ? "border-primary scale-[1.02] ring-2 ring-primary/20" : "border-transparent"
                       )}
                       onClick={() => setStagedCoverImage(img.imageUrl)}
                     >
                       <img src={img.imageUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-muted/30 border-t flex flex-col gap-2 shrink-0">
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={handleUpdateImage}
              disabled={isUploading || !stagedCoverImage}
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save cover"}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" className="w-full h-12 rounded-xl font-semibold text-muted-foreground">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Detail Dialog */}
      <Dialog open={!!selectedExpenseDetail} onOpenChange={(open) => !open && setSelectedExpenseDetail(null)}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {selectedExpenseDetail && (
            <>
              <div className={cn(
                "h-48 relative flex flex-col items-center justify-center overflow-hidden",
                getCategoryColor(selectedExpenseDetail.category)
              )}>
                <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-black/5 text-foreground/60 hover:bg-black/10 transition-all z-20">
                  <X className="h-5 w-5" />
                </DialogClose>
                <div className="relative z-10 flex flex-col items-center text-center px-6">
                  <div className="h-16 w-16 rounded-3xl bg-white/50 backdrop-blur-md flex items-center justify-center mb-3 shadow-sm">
                    {(() => {
                      const Icon = getCategoryIcon(selectedExpenseDetail.category);
                      return <Icon className="h-8 w-8" />;
                    })()}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-foreground">₹{parseFloat(selectedExpenseDetail.amount).toFixed(2)}</h2>
                  <p className="text-xs font-bold text-foreground/60 uppercase tracking-widest mt-1">{selectedExpenseDetail.description}</p>
                </div>
              </div>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <User className="h-3 w-3" /> Paid by
                      </Label>
                      <p className="text-sm font-bold text-foreground">{selectedExpenseDetail.payerName}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarIcon className="h-3 w-3" /> Date
                      </Label>
                      <p className="text-sm font-bold text-foreground">{selectedExpenseDetail.date}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Tag className="h-3 w-3" /> Category
                      </Label>
                      <p className="text-sm font-bold text-foreground">{selectedExpenseDetail.category}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" /> Method
                      </Label>
                      <p className="text-sm font-bold text-foreground">{selectedExpenseDetail.paymentType || 'Not specified'}</p>
                    </div>
                  </div>

                  <Separator className="bg-muted/30" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Split Breakdown</Label>
                      <Badge variant="outline" className="text-[9px] font-bold border-primary/20 text-primary bg-primary/5 uppercase">
                        {selectedExpenseDetail.splitType.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {selectedExpenseDetail.splitType === 'unsplit' ? (
                        <div className="py-8 bg-accent/5 rounded-3xl border-2 border-dashed border-accent/20 flex flex-col items-center justify-center text-center px-6">
                           <Timer className="h-8 w-8 text-accent mb-2 animate-pulse" />
                           <p className="text-sm font-bold text-foreground">Waiting to be split</p>
                           <p className="text-[10px] text-muted-foreground mt-1">This transaction is currently a draft and doesn't impact balances yet.</p>
                           <Button 
                             size="sm" 
                             className="mt-4 rounded-xl bg-accent text-accent-foreground font-bold h-9 px-6"
                             onClick={() => router.push(`/trips/${id}/expenses/${selectedExpenseDetail.id}/split`)}
                           >
                             Finalize Split
                           </Button>
                        </div>
                      ) : (
                        selectedExpenseSplits.map((split, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border shadow-sm">
                                <AvatarImage src={split.avatar} />
                                <AvatarFallback className="text-[10px] font-bold">{split.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-bold text-foreground">{split.name}</p>
                                {split.isFamilyGroup && <p className="text-[8px] font-bold text-muted-foreground uppercase">Family Unit</p>}
                              </div>
                            </div>
                            <p className="text-xs font-extrabold text-foreground">₹{split.share.toFixed(2)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 pt-0 mt-4">
                <Button 
                  variant="ghost" 
                  className="w-full h-12 rounded-2xl font-bold text-muted-foreground text-sm hover:bg-muted"
                  onClick={() => setSelectedExpenseDetail(null)}
                >
                  Close Details
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                            <>
                              {format(editDateRange.from, "d MMM")} - {format(editDateRange.to, "d MMM")}
                            </>
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

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/60 ml-1">Trip status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-14 rounded-2xl border-2 border-muted/20 bg-white shadow-sm font-semibold text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="Upcoming">
                        <div className="flex items-center gap-3"><Timer className="h-4 w-4" />Upcoming</div>
                      </SelectItem>
                      <SelectItem value="Active">
                        <div className="flex items-center gap-3"><Activity className="h-4 w-4" />Active</div>
                      </SelectItem>
                      <SelectItem value="Completed">
                        <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4" />Completed</div>
                      </SelectItem>
                      <SelectItem value="Settled">
                        <div className="flex items-center gap-3"><Archive className="h-4 w-4" />Settled</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-sm font-semibold text-foreground/60 ml-1">Friends & families</Label>
                  <span className="text-[10px] text-primary font-semibold">
                    {editParticipants.length} {editParticipants.length === 1 ? 'family' : 'families'} added
                  </span>
                </div>
                
                <div className="relative">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search friends or add guest..." 
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

                <div className="space-y-4 pt-2">
                  {editParticipants.map((p) => {
                    const isMe = p.isUser && p.userId === user?.uid;
                    const headName = p.name.replace(" (You)", "");
                    const familyDisplayName = isMe ? "Your family" : `${headName}'s family`;
                    const hasSuggestions = p.suggestedFamily && p.suggestedFamily.length > 0;

                    return (
                      <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white/50">
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
                            {!isMe && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveParticipant(p.id)}>
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

                              {(p.familyMembers || []).map((fm: string) => (
                                <Badge 
                                  key={fm} 
                                  variant="outline" 
                                  className="pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2 bg-white border-primary/30 text-primary font-semibold shadow-sm group animate-in zoom-in-95 duration-200"
                                >
                                  <span className="text-[10px] font-semibold">{fm}</span>
                                  <X 
                                    className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors" 
                                    onClick={() => handleRemoveFamilyMember(p.id, fm)} 
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
                                    onKeyDown={e => e.key === 'Enter' && handleAddFamilyMember(p.id)}
                                    onBlur={() => {
                                      if (!newFamilyMemberName.trim()) setActiveFamilyMemberInput(null);
                                    }}
                                  />
                                  <Button size="sm" className="h-8 px-3 rounded-lg bg-primary font-semibold" onClick={() => handleAddFamilyMember(p.id)}>Add</Button>
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

              <Button 
                className="w-full h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base shadow-lg shadow-accent/20 transition-all active:scale-95"
                onClick={handleUpdateTrip}
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-52 bg-destructive/10 relative flex flex-col items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
               <AlertTriangle className="h-10 w-10 text-destructive animate-pulse" />
            </div>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                Delete trip?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-semibold leading-relaxed text-muted-foreground px-4">
                This will permanently remove <span className="text-destructive font-bold">{trip?.name}</span> and all associated expenses. This action cannot be undone.
              </AlertDialogDescription>
            </div>
            <div className="space-y-3 pt-4">
              <Button 
                variant="destructive"
                className="w-full h-14 rounded-2xl font-bold text-base gap-3 shadow-lg shadow-destructive/20 transition-all active:scale-95"
                onClick={handleDeleteTrip}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete permanently
              </Button>
              <Button 
                variant="ghost"
                className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Keep trip
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
