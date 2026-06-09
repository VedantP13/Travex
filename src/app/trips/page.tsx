"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/bottom-nav";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { AnimatedCompass } from "@/components/animated-compass";

export default function AllTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tripData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrips(tripData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore connection failed:", error);
        toast({
          title: "Connection error",
          description: "Could not sync trips. Please check your Firebase config.",
          variant: "destructive"
        });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  const filteredTrips = trips.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-32">
      <header className="px-safe-pad pt-10 pb-6 bg-white border-b rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Your Trips</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search your adventures..." 
            className="h-14 pl-12 rounded-2xl bg-muted border-none shadow-sm focus-visible:ring-primary placeholder:text-muted-foreground/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="px-safe-pad pt-8 space-y-6 flex-1">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
            <AnimatedCompass className="h-10 w-10 text-primary" />
            <p className="text-sm font-bold">Bringing your trips to life...</p>
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="grid gap-5">
            {filteredTrips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white rounded-3xl group">
                  <div className="h-36 w-full relative">
                    <img 
                      src={trip.image || PlaceHolderImages.find(img => img.id === "trip-bali")?.imageUrl} 
                      alt={trip.name} 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge className="absolute top-4 right-4 bg-white/90 text-foreground border-none backdrop-blur-md font-bold text-[10px]">
                      {trip.status || "Upcoming"}
                    </Badge>
                  </div>
                  <CardHeader className="p-5 space-y-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold">{trip.name}</CardTitle>
                      <span className="text-[10px] font-bold px-3 py-1 bg-muted rounded-full flex items-center gap-1.5">
                        <Users className="h-3 w-3" /> {trip.participants?.length || 0}
                      </span>
                    </div>
                    <CardDescription className="text-xs font-medium text-muted-foreground">{trip.date || "Just created"}</CardDescription>
                  </CardHeader>
                  <div className="px-5 pb-5 pt-0 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Total spent</p>
                      <p className="text-base font-bold text-foreground">₹{(trip.totalSpent || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Your share</p>
                      <p className={cn(
                        "text-base font-bold",
                        (trip.yourBalance || 0) < 0 ? "text-destructive" : "text-primary"
                      )}>
                        {(trip.yourBalance || 0) < 0 ? "-" : "+"}₹{Math.abs(trip.yourBalance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-muted px-8">
             <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
               <AnimatedCompass className="h-8 w-8 text-muted-foreground" />
             </div>
             <p className="text-lg font-bold text-foreground">No trips found</p>
             <p className="text-sm text-muted-foreground mt-2 mb-6">Try searching for something else or start a new adventure.</p>
             <Link href="/trips/new">
               <Button className="font-bold rounded-2xl px-10 h-14 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform hover:scale-110">
                 Create new trip
               </Button>
             </Link>
          </div>
        )}
      </main>

      <div className="fixed bottom-10 right-8">
        <Link href="/trips/new">
          <Button 
            size="lg" 
            className="rounded-full h-16 w-16 shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 p-0 transition-all hover:scale-110 active:scale-95"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}