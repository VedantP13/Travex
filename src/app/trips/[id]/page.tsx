
"use client";

import { useState, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { getTripImage } from "@/lib/image-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function TripDetails() {
  const router = useRouter();
  const { id } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id || !firestore) return;

    // Listen to trip document
    const tripUnsubscribe = onSnapshot(doc(firestore, "trips", id as string), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrip({ id: snapshot.id, ...data });
        setEditName(data.name || "");
        setEditDate(data.date || "");
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

    // Listen to expenses subcollection
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

  const handleUpdateTrip = async () => {
    if (!id || !firestore || !editName.trim()) return;
    setIsSaving(true);
    
    const tripRef = doc(firestore, "trips", id as string);
    const updateData = {
      name: editName.trim(),
      date: editDate.trim() || null
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

  if (loading && !trip) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col pb-32">
      {/* Hero Header - Cinematic full width with scrim and rounded corners */}
      <div className="relative h-[280px] w-full overflow-hidden shrink-0 rounded-b-[2.5rem] shadow-xl shadow-black/10">
        <img 
          src={getTripImage(trip?.name || "", trip?.image, trip?.imageHint)} 
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" 
          alt={trip?.name}
          data-ai-hint={trip?.imageHint || "travel landscape"}
        />
        {/* Scrim Overlay for Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Navigation Over Image - Balanced Controls */}
        <div className="absolute top-6 left-safe-pad right-safe-pad flex justify-between items-center z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')} 
            className="bg-white/90 backdrop-blur-md text-primary hover:bg-primary hover:text-white rounded-2xl h-11 w-11 shadow-lg shadow-black/5 transition-all active:scale-95"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-white/90 backdrop-blur-md text-primary hover:bg-primary hover:text-white rounded-2xl h-11 w-11 shadow-lg shadow-black/5 transition-all active:scale-95"
              >
                <Settings className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-[180px] p-2 shadow-2xl border-none">
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Trip Options</DropdownMenuLabel>
              <DropdownMenuItem 
                className="rounded-xl py-3 px-3 flex items-center gap-3 cursor-pointer focus:bg-primary/10"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="font-bold text-sm">Edit details</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 mx-2" />
              <DropdownMenuItem 
                className="rounded-xl py-3 px-3 flex items-center gap-3 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="font-bold text-sm">Delete trip</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Trip Information Over Image */}
        <div className="absolute bottom-6 left-safe-pad right-safe-pad space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold px-3 py-1 rounded-lg">
              {trip?.status || "Active"}
            </Badge>
            <span className="text-[10px] font-bold text-white/90 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
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

      {/* Content Area */}
      <div className="px-safe-pad pt-8 flex-1">
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white p-1.5 rounded-2xl shadow-inner">
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
                  className="text-center py-16 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-muted/30 px-10 cursor-pointer hover:bg-white transition-colors"
                  onClick={() => router.push(`/trips/${id}/add`)}
                >
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Plus className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-primary">No expenses yet</h3>
                    <p className="text-sm text-muted-foreground">Add your first one to start tracking costs</p>
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
      
      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-8 z-30">
        <Button 
          size="lg" 
          className="rounded-full h-16 w-16 shadow-2xl shadow-accent/40 bg-accent hover:bg-accent/90 p-0 transition-transform hover:scale-110 active:scale-95 group"
          onClick={() => router.push(`/trips/${id}/add`)}
        >
          <Plus className="h-10 w-10 transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-32 bg-foreground relative flex items-center justify-center">
            <DialogTitle className="text-xl font-bold text-white relative z-10">Edit Trip</DialogTitle>
            <DialogDescription className="sr-only">Update your trip name and travel dates.</DialogDescription>
            <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trip-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Trip Name</Label>
                <Input 
                  id="trip-name"
                  placeholder="e.g. Goa 2024"
                  className="h-14 rounded-2xl shadow-inner border-none bg-muted/40 font-bold text-lg"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-date" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Dates (Optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                  <Input 
                    id="trip-date"
                    placeholder="e.g. 12-15 Aug"
                    className="h-14 rounded-2xl pl-12 shadow-inner border-none bg-muted/40 font-bold"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={handleUpdateTrip}
              disabled={isSaving || !editName.trim()}
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
                Delete Trip?
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
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                Delete Permanently
              </Button>
              <Button 
                variant="ghost"
                className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Keep Trip
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
