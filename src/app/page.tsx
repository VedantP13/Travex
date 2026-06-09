"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, ChevronRight, Compass, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/bottom-nav";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { AnimatedCompass } from "@/components/animated-compass";

export default function Home() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
        setError(false);
      },
      (error) => {
        console.error("Firestore connection failed:", error);
        setError(true);
        setLoading(false);
        toast({
          title: "Connection error",
          description: "Could not sync trips. Please check your Firebase config.",
          variant: "destructive"
        });
      }
    );
    return () => unsubscribe();
  }, [toast]);

  const activeTrip = trips.find(t => t.status === "Active") || trips[0];

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-32">
      {/* Header */}
      <header className="px-safe-pad pt-10 pb-12 bg-foreground text-background rounded-b-[2.5rem] shadow-2xl shadow-black/10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-accent rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20 transition-transform hover:scale-105">
              <Compass className="h-7 w-7 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-background">Travex</h1>
              <p className="text-sm opacity-70 text-background">Welcome back, Marco</p>
            </div>
          </div>
          <Link href="/profile">
            <Avatar className="h-12 w-12 border-2 border-accent hover:scale-110 transition-transform shadow-xl shadow-black/20">
              <AvatarImage src="https://picsum.photos/seed/user1/100/100" />
              <AvatarFallback>MC</AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-inner">
            <p className="text-[10px] font-bold opacity-60 mb-2 uppercase tracking-widest">You owe</p>
            <p className="text-2xl font-bold">₹0.00</p>
          </div>
          <div className="bg-accent/10 backdrop-blur-md p-6 rounded-3xl border border-accent/20 shadow-inner">
            <p className="text-[10px] font-bold text-accent mb-2 uppercase tracking-widest">Owed to you</p>
            <p className="text-2xl font-bold text-accent">₹0.00</p>
          </div>
        </div>
      </header>

      {/* Dynamic Trip Spotlight */}
      <section className="px-safe-pad -mt-10">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {activeTrip ? (
            <Card className="col-span-8 border-none shadow-2xl bg-primary text-primary-foreground rounded-[2rem] p-6 flex flex-col justify-between group transition-all hover:translate-y-[-2px]">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-extrabold opacity-80 uppercase tracking-wider">Ongoing: {activeTrip.name}</span>
                </div>
                <p className="text-2xl font-bold">₹{(activeTrip.totalSpent || 0).toFixed(2)} spent</p>
                <p className="text-[11px] opacity-70 mt-1 font-semibold">{(activeTrip.participants?.length || 0)} friends splitting</p>
              </div>
              <Link 
                href={`/trips/${activeTrip.id}/add`} 
                className="mt-8 flex items-center gap-2 text-xs font-bold text-accent hover:opacity-80 transition-opacity"
              >
                Add expense <ChevronRight className="h-4 w-4" />
              </Link>
            </Card>
          ) : (
            <Card className="col-span-8 border-none shadow-2xl bg-primary text-primary-foreground rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
               <Map className="h-10 w-10 text-accent mb-3 opacity-50" />
               <p className="text-sm font-bold tracking-tight opacity-90 leading-tight">No active adventures yet</p>
            </Card>
          )}
          
          <Link 
            href="/trips/new" 
            className="col-span-4 bg-white shadow-2xl rounded-[2rem] flex flex-col items-center justify-center p-6 gap-3 group hover:bg-accent transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border-2 border-accent/10"
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-white/20 group-hover:text-white transition-all shadow-sm">
              <Plus className="h-8 w-8" />
            </div>
            <span className="text-[10px] font-extrabold text-muted-foreground text-center px-1 uppercase tracking-tighter group-hover:text-white transition-colors">New trip</span>
          </Link>
        </div>
      </section>

      {/* Recent Trips Section */}
      <main className="px-safe-pad pt-12 space-y-6 flex-1">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Trip collections
          </h2>
          <Link href="/trips">
            <Button variant="link" className="text-primary text-xs font-bold p-0 hover:no-underline hover:text-primary/80">
              See all
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-24 text-muted-foreground gap-3">
            <AnimatedCompass className="h-10 w-10 text-primary" />
            <p className="text-sm font-bold tracking-tight">Gathering your journeys...</p>
          </div>
        ) : error ? (
           <div className="text-center py-20 bg-destructive/5 rounded-[2rem] border-2 border-dashed border-destructive/20 px-8">
             <p className="text-sm font-bold text-destructive">Could not load trips</p>
             <p className="text-[10px] text-muted-foreground mt-1">Check your connection or Firebase config.</p>
             <Button 
               variant="outline" 
               className="mt-4 rounded-xl font-bold text-xs" 
               onClick={() => window.location.reload()}
             >
               Retry sync
             </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {trips.length > 0 ? trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="overflow-hidden border-none shadow-sm hover:shadow-lg transition-all bg-white rounded-[2rem] group">
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
                  <CardHeader className="p-6 space-y-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold">{trip.name}</CardTitle>
                      <span className="text-[10px] font-bold px-3 py-1 bg-muted rounded-full flex items-center gap-1.5">
                        <Users className="h-3 w-3" /> {trip.participants?.length || 0}
                      </span>
                    </div>
                    <CardDescription className="text-xs font-medium text-muted-foreground">{trip.date || "Ready for departure"}</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6 pt-0 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Total</p>
                      <p className="text-base font-bold">₹{(trip.totalSpent || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Your Balance</p>
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
            )) : (
              <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 px-10">
                 <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Compass className="h-8 w-8 text-muted-foreground/50" />
                 </div>
                 <p className="text-lg font-bold text-foreground">No trips yet</p>
                 <p className="text-sm text-muted-foreground mt-2 mb-8">Split expenses effortlessly on your next trip.</p>
                 <Link href="/trips/new">
                   <Button variant="default" className="font-bold rounded-2xl px-10 h-14 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform hover:scale-105">
                     Create your first trip
                   </Button>
                 </Link>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
