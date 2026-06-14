
"use client";

import { useState, useEffect, useRef } from "react";
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
  Calendar,
  X,
  AlertTriangle,
  UserPlus,
  ImageIcon,
  Upload,
  Camera,
  CheckCircle2,
  Activity,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { getTripImage } from "@/lib/image-utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // Settings States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editParticipants, setEditParticipants] = useState<any[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!id || !firestore) return;

    const tripUnsubscribe = onSnapshot(doc(firestore, "trips", id as string), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrip({ id: snapshot.id, ...data });
        setEditName(data.name || "");
        setEditDate(data.date || "");
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

  const handleUpdateImage = async (imageUrl: string) => {
    if (!id || !firestore) return;
    setIsUploading(true);
    
    const tripRef = doc(firestore, "trips", id as string);
    updateDoc(tripRef, { image: imageUrl })
      .then(() => {
        toast({ title: "Cover updated" });
        setIsImagePickerOpen(false);
      })
      .catch(err => console.error(err))
      .finally(() => setIsUploading(false));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateTrip = async () => {
    if (!id || !firestore || !editName.trim()) return;
    setIsSaving(true);
    
    const tripRef = doc(firestore, "trips", id as string);
    const updateData = {
      name: editName.trim(),
      date: editDate.trim() || null,
      status: editStatus,
      participants: editParticipants,
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
  };

  const handleRemoveParticipant = (pid: string) => {
    const p = editParticipants.find(part => part.id === pid);
    if (p?.isUser) {
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

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Food': return Utensils;
      case 'Transport': return Car;
      case 'Stay': return Home;
      case 'Shopping': return ShoppingBag;
      default: return MoreVertical;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Food': return 'bg-orange-100 text-orange-600';
      case 'Transport': return 'bg-blue-100 text-blue-600';
      case 'Stay': return 'bg-purple-100 text-purple-600';
      case 'Shopping': return 'bg-pink-100 text-pink-600';
      default: return 'bg-teal-100 text-teal-600';
    }
  };

  const StatusIcon = editStatus === 'Upcoming' ? Timer : editStatus === 'Active' ? Activity : CheckCircle2;

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
                <span className="font-medium text-sm">Edit details</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 mx-3 bg-muted/30" />
              <DropdownMenuItem 
                className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground active:scale-[0.98] transition-all"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <div className="h-8 w-8 rounded-full bg-destructive/10 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">Delete trip</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsImagePickerOpen(true)}
          className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-xl h-9 w-9 border border-white/10 shadow-lg z-10 transition-all active:scale-95"
          title="Change cover"
        >
          <Camera className="h-5 w-5" strokeWidth={2.5} />
        </Button>

        <div className="absolute bottom-6 left-safe-pad right-safe-pad space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3">
            <Badge className={cn(
              "backdrop-blur-md text-white border border-white/10 text-[10px] font-bold px-3 py-1 rounded-lg",
              trip?.status === 'Active' ? 'bg-primary/40' : trip?.status === 'Completed' ? 'bg-green-500/40' : 'bg-white/20'
            )}>
              {trip?.status || "Active"}
            </Badge>
            <span className={cn(
              "text-[10px] font-bold flex items-center gap-1.5",
              trip?.date ? "text-white" : "text-white/60"
            )}>
              <Calendar className={cn("h-3 w-3", trip?.date && "stroke-[3px]")} />
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
            <span className="text-[10px] font-bold text-white/80">
              {trip?.participants?.length} participants
            </span>
          </div>
        </div>
      </div>

      <div className="px-safe-pad pt-8 flex-1">
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white p-1.5 rounded-2xl shadow-inner border border-muted/20">
            <TabsTrigger 
              value="feed" 
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted/50 font-bold text-sm transition-all"
            >
              Trip feed
            </TabsTrigger>
            <TabsTrigger 
              value="balances" 
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted/50 font-bold text-sm transition-all"
            >
              Balances
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-6">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <input 
                type="text" 
                placeholder="Find an expense..." 
                className="w-full h-14 bg-white rounded-2xl pl-12 pr-14 text-sm font-medium border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/40"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 w-10 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 pb-24">
              {expenses.length > 0 ? expenses.map(item => {
                const Icon = getCategoryIcon(item.category);
                const isUnsplit = item.splitType === 'unsplit';
                
                return (
                  <div key={item.id} className={cn(
                    "bg-white p-5 rounded-[2rem] shadow-sm border-2 transition-all flex items-center gap-5 group",
                    isUnsplit ? "border-accent/30 bg-accent/5" : "border-transparent hover:border-primary/20 hover:shadow-md"
                  )}>
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                      getCategoryColor(item.category)
                    )}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm truncate text-foreground">{item.description}</h3>
                        {isUnsplit && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Paid by <span className="font-bold text-foreground/80">{item.payerName?.split(' ')[0] || "Explorer"}</span> • {item.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base tracking-tight text-foreground">
                        <span className="font-bold">₹</span>{parseFloat(item.amount || 0).toFixed(2)}
                      </p>
                      {isUnsplit ? (
                        <div className="flex items-center gap-1 justify-end mt-1.5">
                          <Clock className="h-3 w-3 text-accent" />
                          <span className="text-[8px] font-bold text-accent uppercase tracking-tighter">Pending split</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[8px] h-4 font-bold mt-1.5 px-2 bg-muted/50 border-none">
                          {item.splitType === 'equal_person' ? 'Equal' : item.splitType === 'equal_family' ? 'Family' : 'Custom'}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div 
                  className="text-center py-20 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-muted/30 px-10 cursor-pointer hover:bg-white transition-colors"
                  onClick={() => router.push(`/trips/${id}/add`)}
                >
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm transition-transform">
                    <Plus className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-bold text-primary">No expenses yet</h3>
                    <p className="text-sm text-muted-foreground px-6 leading-relaxed">Add your first one to start tracking your journey costs.</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="balances" className="mt-6 space-y-6">
            <div className="bg-foreground text-background p-8 rounded-[2.5rem] mb-8 shadow-2xl shadow-black/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-32 w-32 bg-primary/20 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Current standing</p>
                <p className="text-3xl font-bold tracking-tight">You are even</p>
                <div className="mt-8 flex gap-3">
                  <Button className="bg-accent hover:bg-accent/90 text-foreground font-bold flex-1 h-12 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95">Settle up</Button>
                  <Button variant="outline" className="border-white/20 hover:bg-white/10 flex-1 h-12 rounded-2xl text-white font-bold transition-all">Remind all</Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-2">Member breakdown</h4>
              {trip?.participants?.map((member: any, idx: number) => (
                <div key={idx} className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between border-2 border-transparent hover:border-primary/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-md transition-transform group-hover:scale-105">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="font-bold bg-muted">{member.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h5 className="font-bold text-sm text-foreground">{member.name}</h5>
                      <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Settled up
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold text-sm text-muted-foreground`}>₹0.00</p>
                    <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="h-24 bg-foreground relative flex items-center justify-center">
            <DialogTitle className="text-xl font-bold text-white relative z-10">Change cover</DialogTitle>
            <DialogDescription className="sr-only">Choose a predefined image or upload your own.</DialogDescription>
            <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-muted-foreground ml-1">Upload custom image</Label>
              <div 
                onClick={() => imageInputRef.current?.click()}
                className="h-28 w-full rounded-2xl border-2 border-dashed border-primary/20 bg-white flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-primary/5 transition-all shadow-sm group"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold">Pick from device</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-muted-foreground ml-1">Predefined styles</Label>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                 {PlaceHolderImages.filter(img => img.id.startsWith('trip-')).map((img) => (
                   <div 
                     key={img.id}
                     className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group shadow-sm"
                     onClick={() => handleUpdateImage(img.imageUrl)}
                   >
                     <img src={img.imageUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                     <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-24 bg-foreground relative flex items-center justify-center">
            <DialogTitle className="text-xl font-bold text-white relative z-10">Edit trip</DialogTitle>
            <DialogDescription className="sr-only">Update your trip name, dates, status and participants.</DialogDescription>
            <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trip-name" className="text-sm font-bold text-muted-foreground ml-1">Trip name</Label>
                  <Input 
                    id="trip-name"
                    placeholder="e.g. Goa 2024"
                    className="h-14 rounded-2xl shadow-inner border-none bg-white font-bold text-lg"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-date" className="text-sm font-bold text-muted-foreground ml-1">Dates (optional)</Label>
                  <div className="relative">
                    <Calendar className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10",
                      editDate ? "text-foreground stroke-[2px]" : "text-muted-foreground/40"
                    )} />
                    <Input 
                      id="trip-date"
                      placeholder="e.g. 12-15 Aug"
                      className={cn(
                        "h-14 rounded-2xl pl-12 shadow-inner border-none bg-white font-bold transition-colors",
                        editDate ? "text-foreground" : "text-muted-foreground/40"
                      )}
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-muted-foreground ml-1">Trip status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-14 rounded-2xl border-none bg-white shadow-inner font-bold flex items-center gap-3">
                      <StatusIcon className="h-5 w-5" />
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="Upcoming">
                        <div className="flex items-center gap-3">
                          <Timer className="h-4 w-4" /> 
                          <span>Upcoming</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Active">
                        <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4" /> 
                          <span>Active</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Completed">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4" /> 
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-sm font-bold text-muted-foreground ml-1">Friends & families</Label>
                    <span className="text-[10px] font-bold text-primary">{editParticipants.length} groups added</span>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add guest..." 
                      className="h-12 rounded-xl bg-white border-none shadow-inner"
                      value={newParticipantName}
                      onChange={e => setNewParticipantName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddParticipant()}
                    />
                    <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={handleAddParticipant}>
                      <UserPlus className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4 pt-2">
                    {editParticipants.map((p) => {
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
                                <span className="font-bold text-sm tracking-tight">{familyDisplayName}</span>
                              </div>
                              {!p.isUser && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveParticipant(p.id)}>
                                  <Trash2 className="h-4 w-4" />
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

                                {p.familyMembers.map((fm: string) => (
                                  <Badge 
                                    key={fm} 
                                    variant="outline" 
                                    className="pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2 bg-white border-primary/30 text-primary font-bold shadow-sm group animate-in zoom-in-95 duration-200"
                                  >
                                    <span className="text-[10px] font-bold">{fm}</span>
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
                                      className="h-8 text-xs rounded-lg bg-white w-24 sm:w-32"
                                      value={newFamilyMemberName}
                                      onChange={e => setNewFamilyMemberName(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleAddFamilyMember(p.id)}
                                      onBlur={() => {
                                        if (!newFamilyMemberName.trim()) setActiveFamilyMemberInput(null);
                                      }}
                                    />
                                    <Button size="sm" className="h-8 px-3 rounded-lg bg-primary" onClick={() => handleAddFamilyMember(p.id)}>Add</Button>
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
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
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
