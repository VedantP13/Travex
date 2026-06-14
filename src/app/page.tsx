
"use client";

import Link from "next/link";
import { Plus, ChevronRight, Compass, MapPinPlus, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedCompass } from "@/components/animated-compass";
import { useTrips } from "@/context/trips-context";
import { useUser, useFirestore } from "@/firebase";
import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

export default function Home() {
  const { trips, loading, error } = useTrips();
  const { user } = useUser();
  const firestore = useFirestore();
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);

  useEffect(() => {
    if (!user?.uid || !firestore) return;

    const profileData = {
      displayName: user.displayName || "Explorer",
      photoURL: user.photoURL || "",
      email: user.email || "",
      isAnonymous: user.isAnonymous,
      updatedAt: serverTimestamp(),
    };
    
    setDoc(doc(firestore, "users", user.uid), profileData, { merge: true })
      .catch(err => console.error("Profile sync failed:", err));

    const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      if (snap.exists()) setFirestoreProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid, firestore, user?.displayName, user?.photoURL, user?.email, user?.isAnonymous]);

  const activeTrip = trips.find(t => t.status === "Active") || trips[0];
  const isAnonymous = user?.isAnonymous;

  const displayPhoto = firestoreProfile?.photoURL || user?.photoURL || "";
  const welcomeName = firestoreProfile?.displayName || user?.displayName;
  const greetingName = welcomeName?.split(' ')[0] || (isAnonymous ? 'Guest' : 'Explorer');
  
  const displayNameForFallback = welcomeName || (isAnonymous ? "Guest" : "User");

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-32">
      {/* Header - Compressed pt/pb */}
      <header className="px-safe-pad pt-8 pb-8 bg-foreground text-background rounded-b-[2.5rem] shadow-2xl shadow-black/10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-accent rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20 transition-transform hover:scale-105">
              <Compass className="h-7 w-7 text-foreground" />
            </div>
            <div>
              <p className="text-xs opacity-70 text-background font-medium">Hi,</p>
              <h1 className="text-2xl font-bold tracking-tight text-background leading-none mt-0.5">
                {greetingName}
              </h1>
            </div>
          </div>
          <Link href="/profile" className="relative group">
            <Avatar className="h-14 w-14 border-2 border-accent/30 hover:border-accent hover:scale-110 transition-all duration-300 shadow-xl shadow-black/40 ring-4 ring-white/5">
              <AvatarImage src={displayPhoto} className="object-cover" />
              <AvatarFallback className="bg-white/10 text-accent font-bold">
                {displayNameForFallback[0]}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-accent w-1/2 animate-[progress-loading_1.5s_infinite_linear]" />
            </div>
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-inner">
              <p className="text-[10px] font-bold opacity-60 mb-2 uppercase tracking-widest">You owe</p>
              <div className="flex items-baseline font-bold text-2xl">
                <span className="text-2xl font-bold">₹</span>
                <span>0.00</span>
              </div>
              <p className="text-[9px] opacity-40 mt-1 font-medium italic">All settled up!</p>
            </div>
            <div className="bg-accent/10 backdrop-blur-md p-6 rounded-3xl border border-accent/20 shadow-inner">
              <p className="text-[10px] font-bold text-accent mb-2 uppercase tracking-widest">Owed to you</p>
              <div className="flex items-baseline font-bold text-2xl text-accent">
                <span className="text-2xl font-bold">₹</span>
                <span>0.00</span>
              </div>
              <p className="text-[9px] text-accent/50 mt-1 font-medium italic">No pending dues</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-2">
            <p className="text-sm font-medium text-white/50 leading-relaxed">
              Welcome to Travex. Start by creating a trip group to split expenses.
            </p>
          </div>
        )}
      </header>

      {/* Dynamic Trip Spotlight - Tighter margin top */}
      <section className="px-safe-pad mt-6">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {activeTrip ? (
            <>
              <Card className="col-span-8 border-none shadow-2xl bg-primary text-primary-foreground rounded-[2.5rem] p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:translate-y-[-1px]">
                <div className="space-y-3 relative z-10">
                  <div className="space-y-2">
                    <div className="flex">
                      <Badge variant="outline" className="bg-white/10 text-white/90 border-white/20 text-[10px] font-extrabold rounded-lg px-2.5 py-1 mb-1 border-none shadow-sm">
                        Ongoing Trip
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight truncate leading-tight text-white">{activeTrip.name}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-white/50 flex items-center gap-1.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {activeTrip.date || "Ready"}
                      </p>
                      <div className="flex -space-x-1.5">
                        {activeTrip.participants?.slice(0, 3).map((p: any, idx: number) => (
                          <Avatar key={idx} className="h-5 w-5 border-2 border-primary ring-1 ring-white/10 shadow-sm">
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback className="text-[7px] bg-accent text-foreground font-bold">{p.name?.[0]}</AvatarFallback>
                          </Avatar>
                        ))}
                        {activeTrip.participants?.length > 3 && (
                          <div className="h-5 w-5 rounded-full bg-white/10 border-2 border-primary flex items-center justify-center text-[6px] font-bold text-white backdrop-blur-sm">
                            +{activeTrip.participants.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 mt-2">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Total Spent</p>
                    <div className="flex items-baseline font-bold text-2xl tracking-tight text-white leading-none">
                      <span className="text-2xl font-bold">₹</span>
                      <span>{(activeTrip.totalSpent || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 relative z-10">
                  <Link 
                    href={`/trips/${activeTrip.id}/add`} 
                    className="inline-flex items-center justify-center gap-2 w-full h-11 px-5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold text-white transition-all backdrop-blur-sm shadow-sm"
                  >
                    Add expense <ChevronRight className="h-4 w-4 text-accent" />
                  </Link>
                </div>
              </Card>

              <Link 
                href="/trips/new" 
                className="col-span-4 bg-white shadow-xl rounded-[2.5rem] flex flex-col items-center justify-center p-4 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border-2 border-primary/5 group hover:bg-accent hover:border-accent"
              >
                <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-white/20 group-hover:text-white transition-all shadow-sm shrink-0 mb-3">
                  <MapPinPlus className="h-10 w-10" />
                </div>
                <span className="text-xs font-bold tracking-tight text-foreground group-hover:text-white transition-colors text-center leading-tight px-1">
                  New trip
                </span>
              </Link>
            </>
          ) : (
            <Link 
              href="/trips/new" 
              className="col-span-12 bg-white shadow-md hover:shadow-xl rounded-[2.5rem] flex items-center p-5 gap-5 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-primary/5 group hover:bg-accent hover:border-accent"
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0 transition-all group-hover:bg-white/20 group-hover:text-white">
                <MapPinPlus className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight group-hover:text-white">Create New Trip</h3>
                <p className="text-xs text-muted-foreground font-medium mt-1 line-clamp-2 group-hover:text-white/70">
                  Plan journeys and split expenses effortlessly
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white shadow-sm transition-transform group-hover:translate-x-1 shrink-0 group-hover:bg-white group-hover:text-accent">
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Recent Trips Section - Tighter margin top */}
      <main className="px-safe-pad pt-6 space-y-6 flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Recent trips
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
            {trips.length > 0 ? trips.slice(0, 3).map((trip) => (
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
                      <p className="text-base font-bold text-foreground">
                        <span className="font-bold">₹</span>
                        <span>{(trip.totalSpent || 0).toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Your Balance</p>
                      <p className={cn(
                        "text-base font-bold",
                        (trip.yourBalance || 0) < 0 ? "text-destructive" : "text-primary"
                      )}>
                        {(trip.yourBalance || 0) < 0 ? "-" : "+"}
                        <span className="font-bold">₹</span>
                        <span>{Math.abs(trip.yourBalance || 0).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )) : (
              <div className="text-center py-14 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 px-10">
                 <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <Plus className="h-7 w-7 text-muted-foreground/40" />
                 </div>
                 <p className="text-lg font-bold text-foreground">No trips yet</p>
                 <p className="text-sm text-muted-foreground mt-1 mb-6">Split expenses effortlessly on your next trip.</p>
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
