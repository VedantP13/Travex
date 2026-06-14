
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
import { getTripImage } from "@/lib/image-utils";

export default function Home() {
  const { trips, loading, error } = useTrips();
  const { user } = useUser();
  const firestore = useFirestore();
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const [greetingPrefix, setGreetingPrefix] = useState("Hi,");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreetingPrefix("Good morning,");
      else if (hour < 17) setGreetingPrefix("Good afternoon,");
      else setGreetingPrefix("Good evening,");
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Logic: Prioritize Active trip for the spotlight, fallback to most recent
  const activeTrip = trips.find(t => t.status === "Active") || trips[0];
  const isAnonymous = user?.isAnonymous;

  const displayPhoto = firestoreProfile?.photoURL || user?.photoURL || "";
  const welcomeName = firestoreProfile?.displayName || user?.displayName;
  const greetingName = welcomeName?.split(' ')[0] || (isAnonymous ? 'Guest' : 'Explorer');
  
  const displayNameForFallback = welcomeName || (isAnonymous ? "Guest" : "User");

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-56">
      <header className="px-safe-pad pt-6 pb-6 bg-foreground text-background rounded-b-[2.5rem] shadow-2xl shadow-black/10">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 bg-accent rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20 transition-transform hover:scale-105">
              <Compass className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-background/60 font-medium tracking-tight">{greetingPrefix}</p>
              <h1 className="text-xl font-bold tracking-tight text-background leading-none mt-0.5">
                {greetingName}
              </h1>
            </div>
          </div>
          <Link href="/profile" className="relative group">
            <Avatar className="h-12 w-12 border-2 border-white/10 hover:border-accent hover:scale-110 transition-all duration-300 shadow-xl shadow-black/20">
              <AvatarImage src={displayPhoto} className="object-cover" />
              <AvatarFallback className="bg-white/10 text-white font-bold text-sm">
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
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
              <p className="text-[10px] font-medium text-white/40 mb-1">You owe</p>
              <div className="flex items-baseline font-bold text-xl tracking-tight text-white">
                <span className="font-bold">₹</span>
                <span className="font-bold">0.00</span>
              </div>
            </div>
            <div className="bg-accent/10 backdrop-blur-md p-5 rounded-3xl border border-accent/20">
              <p className="text-[10px] font-medium text-accent/60 mb-1">Owed to you</p>
              <div className="flex items-baseline font-bold text-xl tracking-tight text-accent">
                <span className="font-bold">₹</span>
                <span className="font-bold">0.00</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-1">
            <p className="text-xs font-medium text-white/40 leading-relaxed">
              Start your journey by creating a trip group.
            </p>
          </div>
        )}
      </header>

      <section className="px-safe-pad mt-5">
        <div className="grid grid-cols-12 gap-3 items-stretch">
          {activeTrip ? (
            <>
              <Card className="col-span-8 border-none shadow-xl bg-primary text-primary-foreground rounded-[2.5rem] p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:translate-y-[-1px]">
                <div className="space-y-3 relative z-10">
                  <div className="space-y-2">
                    <div className="flex">
                      <Badge variant="outline" className={cn(
                        "text-white border-none text-[10px] font-medium rounded-lg px-2.5 py-1 mb-1 shadow-sm backdrop-blur-md",
                        activeTrip.status === 'Active' ? 'bg-white/20' : 'bg-white/10'
                      )}>
                        {activeTrip.status === 'Active' ? 'Ongoing Trip' : 'Featured Trip'}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight truncate leading-tight text-white">{activeTrip.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-white/50 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {activeTrip.date || "Ready"}
                      </p>
                      <div className="flex -space-x-1.5">
                        {activeTrip.participants?.slice(0, 3).map((p: any, idx: number) => (
                          <Avatar key={idx} className="h-4 w-4 border border-primary ring-1 ring-white/10 shadow-sm">
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback className="text-[6px] bg-accent text-foreground font-bold">{p.name?.[0]}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 mt-1">
                    <p className="text-[9px] font-medium text-white/40">Total spent</p>
                    <div className="flex items-baseline font-bold text-2xl tracking-tight text-white leading-none">
                      <span className="font-bold">₹</span>
                      <span className="font-bold">{(activeTrip.totalSpent || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <Link 
                    href={`/trips/${activeTrip.id}/add`} 
                    className="inline-flex items-center justify-center gap-2 w-full h-10 px-5 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-bold text-white transition-all backdrop-blur-sm border border-white/5"
                  >
                    Add expense <ChevronRight className="h-3.5 w-3.5 text-accent" />
                  </Link>
                </div>
              </Card>

              <Link 
                href="/trips/new" 
                className="col-span-4 bg-white shadow-lg rounded-[2.5rem] flex flex-col items-center justify-center p-4 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-primary/5 group hover:bg-accent"
              >
                <div className="h-14 w-14 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary group-hover:bg-white/20 group-hover:text-white transition-all shadow-sm shrink-0 mb-3">
                  <MapPinPlus className="h-8 w-8" />
                </div>
                <span className="text-[10px] font-bold tracking-tight text-foreground group-hover:text-white transition-colors text-center leading-tight">
                  New trip
                </span>
              </Link>
            </>
          ) : (
            <Link 
              href="/trips/new" 
              className="col-span-12 bg-white shadow-md hover:shadow-xl rounded-[2.5rem] flex items-center p-5 gap-5 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-primary/5 group hover:bg-accent"
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0 transition-all group-hover:bg-white/20 group-hover:text-white">
                <MapPinPlus className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-white">Create New Trip</h3>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 group-hover:text-white/70">
                  Plan journeys and split expenses effortlessly
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white" />
            </Link>
          )}
        </div>
      </section>

      <main className="px-safe-pad pt-10 space-y-5 flex-1">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Recent trips
          </h2>
          <Link href="/trips">
            <Button variant="link" className="text-primary text-xs font-bold p-0 hover:no-underline">
              See all
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
            <AnimatedCompass className="h-10 w-10 text-primary" />
            <p className="text-xs font-bold">Gathering journeys...</p>
          </div>
        ) : error ? (
           <div className="text-center py-20 bg-destructive/5 rounded-[2rem] border-2 border-dashed border-destructive/20 px-8">
             <p className="text-xs font-bold text-destructive">Could not load trips</p>
             <Button variant="outline" className="mt-4 rounded-xl text-[10px]" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <div className="grid gap-5">
            {trips.length > 0 ? trips.slice(0, 3).map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white rounded-[2rem] group">
                  <div className="h-36 w-full relative">
                    <img 
                      src={getTripImage(trip.name, trip.image, trip.imageHint)} 
                      alt={trip.name} 
                      data-ai-hint={trip.imageHint || "travel landscape"}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge className={cn(
                      "absolute top-4 right-4 text-foreground border-none backdrop-blur-md font-bold text-[10px] shadow-sm px-3",
                      trip.status === 'Active' ? 'bg-accent/90' : 'bg-white/90'
                    )}>
                      {trip.status || "Upcoming"}
                    </Badge>
                  </div>
                  <CardHeader className="p-5 space-y-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold">{trip.name}</CardTitle>
                      <div className="flex -space-x-1.5 bg-muted/40 p-1.5 rounded-full">
                        {trip.participants?.slice(0, 3).map((p: any, idx: number) => (
                          <Avatar key={idx} className="h-4 w-4 border border-white shadow-sm">
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback className="text-[6px] bg-primary text-white font-bold">{p.name?.[0]}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-xs font-medium text-muted-foreground">{trip.date || "Ready for departure"}</CardDescription>
                  </CardHeader>
                  <div className="px-5 pb-5 pt-0 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Total spent</p>
                      <p className="text-base font-bold text-foreground">
                        <span className="font-bold">₹</span>
                        <span className="font-bold">{(trip.totalSpent || 0).toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Your balance</p>
                      <p className={cn(
                        "text-base font-bold",
                        (trip.yourBalance || 0) < 0 ? "text-destructive" : "text-primary"
                      )}>
                        {(trip.yourBalance || 0) < 0 ? "-" : "+"}
                        <span className="font-bold">₹</span>
                        <span className="font-bold">{Math.abs(trip.yourBalance || 0).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )) : (
              <div className="text-center py-14 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 px-10">
                 <div className="h-14 w-14 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                   <Plus className="h-6 w-6 text-muted-foreground/40" />
                 </div>
                 <p className="text-lg font-bold text-foreground">No trips yet</p>
                 <p className="text-xs text-muted-foreground mt-1 mb-6">Start splitting on your next trip.</p>
                 <Link href="/trips/new">
                   <Button variant="default" className="font-bold rounded-2xl px-8 h-12 shadow-xl shadow-primary/20 bg-primary">
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
