
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
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore } from "@/firebase";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { getTripImage } from "@/lib/image-utils";

export default function TripDetails() {
  const router = useRouter();
  const { id } = useParams();
  const firestore = useFirestore();
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !firestore) return;

    // Listen to trip document
    const tripUnsubscribe = onSnapshot(doc(firestore, "trips", id as string), (snapshot) => {
      if (snapshot.exists()) {
        setTrip({ id: snapshot.id, ...snapshot.data() });
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
      orderBy("date", "desc")
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
  }, [id, firestore]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Dining': return Utensils;
      case 'Transport': return Car;
      case 'Stay': return Home;
      case 'Shopping': return ShoppingBag;
      default: return MoreVertical;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Dining': return 'bg-orange-100 text-orange-600';
      case 'Transport': return 'bg-blue-100 text-blue-600';
      case 'Stay': return 'bg-purple-100 text-purple-600';
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
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white px-safe-pad py-4 border-b flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">{trip?.name || "Trip details"}</h1>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Quick Summary */}
      <div className="px-safe-pad py-6 bg-background flex-1">
        <div className="flex gap-4 items-center mb-6">
          <Avatar className="h-16 w-16 rounded-2xl border-4 border-white shadow-sm">
            <AvatarImage src={getTripImage(trip?.name || "", trip?.image)} className="object-cover" />
            <AvatarFallback>{trip?.name?.[0] || "T"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-bold tracking-tight">{trip?.status || "Active"}</Badge>
              <span className="text-xs text-muted-foreground italic">{trip?.date || "No dates"}</span>
            </div>
            <h2 className="text-xl font-bold">{trip?.name}</h2>
            <div className="flex -space-x-2 mt-2">
              {trip?.participants?.map((p: any, idx: number) => (
                <Avatar key={idx} className="h-6 w-6 border-2 border-white">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-white/50 p-1 rounded-xl">
            <TabsTrigger value="feed" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Trip feed</TabsTrigger>
            <TabsTrigger value="balances" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Balances</TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-1 mr-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  className="w-full bg-muted rounded-xl py-2 pl-10 pr-4 text-sm border-none shadow-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <Button size="icon" variant="outline" className="rounded-xl h-10 w-10 border-none bg-white shadow-sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {expenses.length > 0 ? expenses.map(item => {
                const Icon = getCategoryIcon(item.category);
                const isUnsplit = item.splitType === 'unsplit';
                
                return (
                  <div key={item.id} className={cn(
                    "bg-white p-4 rounded-2xl shadow-sm border transition-colors flex items-center gap-4 group",
                    isUnsplit ? "border-accent/30 bg-accent/5" : "border-transparent hover:border-primary/10"
                  )}>
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${getCategoryColor(item.category)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm truncate">{item.description}</h3>
                        {isUnsplit && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
                      </div>
                      <p className="text-xs text-muted-foreground">Paid by <span className="font-medium text-foreground">{item.payerName || "Someone"}</span> • {item.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{parseFloat(item.amount || 0).toFixed(2)}</p>
                      {isUnsplit ? (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Clock className="h-3 w-3 text-accent" />
                          <span className="text-[8px] font-bold text-accent uppercase tracking-tighter">Pending split</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] h-4 font-normal mt-1">
                          {item.splitType === 'equal_person' ? 'All split' : 'Custom'}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-10 bg-white/50 rounded-2xl border-2 border-dashed border-muted/30">
                  <div className="h-12 w-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Plus className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground">No expenses yet</p>
                  <p className="text-[10px] text-muted-foreground/70">Tap the + to add one!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="balances" className="mt-6 space-y-4">
            <div className="bg-foreground text-background p-6 rounded-2xl mb-6">
              <p className="text-xs opacity-70 mb-1">Current standing</p>
              <p className="text-2xl font-bold">You are even</p>
              <div className="mt-4 flex gap-2">
                <Button className="bg-accent hover:bg-accent/90 text-foreground font-bold flex-1">Settle up</Button>
                <Button variant="outline" className="border-white/20 hover:bg-white/10 flex-1">Remind all</Button>
              </div>
            </div>

            <h4 className="text-xs font-bold text-muted-foreground tracking-tight mb-2">Member breakdown</h4>
            {trip?.participants?.map((member: any, idx: number) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h5 className="font-bold text-sm">{member.name}</h5>
                    <p className="text-xs text-muted-foreground">Settled up</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-muted-foreground`}>₹0.00</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 p-0"
          onClick={() => router.push(`/trips/${id}/add`)}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}
