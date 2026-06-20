"use client";

import Link from "next/link";
import { Plus, ChevronRight, Compass, MapPinPlus, Users, Calendar, AlertCircle, Sparkles, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedCompass } from "@/components/animated-compass";
import { useTrips } from "@/context/trips-context";
import { useUser, useFirestore } from "@/firebase";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getTripImage } from "@/lib/image-utils";
import { getInitials, getAvatarFallbackClasses } from "@/lib/avatar-utils";
import { OnboardingDialog } from "@/components/onboarding-dialog";

export default function Home() {
  const { trips, loading, error } = useTrips();
  const { user } = useUser();
  const firestore = useFirestore();
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const [greetingPrefix, setGreetingPrefix] = useState("Hi,");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

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

  // Optimized Profile Sync & Fetching
  useEffect(() => {
    if (!user?.uid || !firestore) return;

    // 1. Setup real-time listener for profile
    const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFirestoreProfile(data);
      } else {
        // 2. Initial sync if profile doesn't exist yet
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        const initialProfile: any = {
          displayName: user.displayName || (user.isAnonymous ? "Guest Explorer" : "Explorer"),
          searchName: (user.displayName || (user.isAnonymous ? "guest explorer" : "explorer")).toLowerCase(),
          email: (user.email || "").toLowerCase(),
          isAnonymous: user.isAnonymous,
          updatedAt: serverTimestamp(),
        };
        
        // Only set photoURL from Auth for Google users if it's the very first time
        if (isGoogleUser && user.photoURL) {
          initialProfile.photoURL = user.photoURL;
        }

        setDoc(doc(firestore, "users", user.uid), initialProfile)
          .catch(err => console.error("Initial profile sync failed:", err));
      }
    });

    return () => unsub();
  }, [user?.uid, firestore, user?.displayName, user?.email, user?.isAnonymous, user?.providerData]);

  // Persistent Onboarding Logic: Show dialog if no trips AND no family members
  useEffect(() => {
    if (!loading && trips.length === 0 && firestoreProfile && !onboardingComplete) {
      const hasFamily = firestoreProfile.familyMembers && firestoreProfile.familyMembers.length > 0;
      
      // If they don't have family set up and no trips, show the dialog to prompt setup
      if (!hasFamily) {
        setShowOnboarding(true);
      }
    }
  }, [loading, trips.length, firestoreProfile, onboardingComplete]);

  // Aggregate Balances Logic
  const { totalOwe, totalOwed } = useMemo(() => {
    return (trips || []).reduce((acc, trip) => {
      if (trip.status === 'Settled' || !trip.netBalances) return acc;

      const me = trip.participants?.find((p: any) => p.isUser && p.userId === user?.uid);
      if (!me) return acc;

      let tripNetBalance = (trip.netBalances[me.id] || 0);
      
      if (me.familyMembers && Array.isArray(me.familyMembers)) {
        me.familyMembers.forEach((fm: string) => {
          const familyMemberId = `${me.id}-${fm}`;
          tripNetBalance += (trip.netBalances[familyMemberId] || 0);
        });
      }

      if (tripNetBalance < -0.01) {
        acc.totalOwe += Math.abs(tripNetBalance);
      } else if (tripNetBalance > 0.01) {
        acc.totalOwed += tripNetBalance;
      }

      return acc;
    }, { totalOwe: 0, totalOwed: 0 });
  }, [trips, user?.uid]);

  const activeTrip = trips.find(t => t.status === "Active") || 
                     trips.find(t => t.status === "Upcoming") || 
                     trips.find(t => t.status !== "Settled") || 
                     trips[0];
                     
  const isPastDue = useMemo(() => {
    if (!activeTrip || activeTrip.status !== 'Active' || !activeTrip.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(activeTrip.endDate) < today;
  }, [activeTrip]);

  // CRITICAL: Prioritize Firestore Profile photo to avoid Auth limits and sync loops
  const displayPhoto = firestoreProfile?.photoURL || user?.photoURL || "";
  const welcomeName = firestoreProfile?.displayName || user?.displayName || (user?.isAnonymous ? 'Guest' : 'Explorer');
  const greetingName = welcomeName.split(' ')[0];
  
  const hasFamily = firestoreProfile?.familyMembers && firestoreProfile.familyMembers.length > 0;

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
              <AvatarFallback className={getAvatarFallbackClasses(welcomeName, true)}>
                {getInitials(welcomeName)}
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
                <span className="font-bold">{totalOwe.toFixed(2)}</span>
              </div>
            </div>
            <div className="bg-accent/10 backdrop-blur-md p-5 rounded-3xl border border-accent/20">
              <p className="text-[10px] font-medium text-accent/60 mb-1">Owed to you</p>
              <div className="flex items-baseline font-bold text-xl tracking-tight text-accent">
                <span className="font-bold">₹</span>
                <span className="font-bold">{totalOwed.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-1">
            <p className="text-xs font-medium text-white/40 leading-relaxed">
              {hasFamily || onboardingComplete 
                ? "Your travel group is ready for takeoff!" 
                : "Start your journey by creating a trip group."}
            </p>
          </div>
        )}
      </header>

      <section className="px-safe-pad mt-5">
        <div className="grid grid-cols-12 gap-3 items-stretch">
          {activeTrip ? (
            <>
              <Card className={cn(
                "col-span-8 border-none shadow-xl rounded-[2.5rem] p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:translate-y-[-1px]",
                isPastDue ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
              )}>
                <div className="space-y-3 relative z-10">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className={cn(
                        "border-none text-[10px] font-bold rounded-lg px-2.5 py-1 mb-1 shadow-sm backdrop-blur-md",
                        isPastDue ? "bg-white text-accent" : "bg-white/10 text-white/80"
                      )}>
                        {activeTrip.status || 'Ongoing'}
                      </Badge>
                      {isPastDue && (
                        <div className="animate-pulse bg-white/20 p-1 rounded-full">
                          <AlertCircle className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold tracking-tight truncate leading-tight text-white">{activeTrip.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className={cn("text-[10px] font-bold flex items-center gap-1", isPastDue ? "text-white/60" : "text-white/50")}>
                        <Calendar className="h-2.5 w-2.5" />
                        {activeTrip.date || "Ready"}
                      </p>
                      <div className="flex -space-x-1.5">
                        {activeTrip.participants?.slice(0, 3).map((p: any, idx: number) => (
                          <Avatar key={idx} className={cn("h-6 w-6 border shadow-sm shrink-0 bg-background", isPastDue ? "border-accent ring-1 ring-white/20" : "border-primary ring-1 ring-white/10")}>
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback className={cn("text-[8px] font-bold", getAvatarFallbackClasses(p.name, true))}>
                              {getInitials(p.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 mt-1">
                    <p className={cn("text-[9px] font-bold uppercase tracking-tight", isPastDue ? "text-white/60" : "text-white/40")}>Total spent</p>
                    <div className="flex items-baseline font-bold text-2xl tracking-tight leading-none">
                      <span className="font-bold">₹</span>
                      <span className="font-bold">{(activeTrip.totalSpent || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <Link 
                    href={isPastDue ? `/trips/${activeTrip.id}` : `/trips/${activeTrip.id}/add`} 
                    className={cn(
                      "inline-flex items-center justify-center gap-2 w-full h-10 px-5 rounded-2xl text-[10px] font-extrabold transition-all backdrop-blur-sm border",
                      isPastDue ? "bg-white text-accent border-white/20 hover:bg-white/90" : "bg-white/10 text-white hover:bg-white/20 border-white/5"
                    )}
                  >
                    {isPastDue ? "Review & Complete" : "Add expense"} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>

              <Link 
                href="/trips/new" 
                className="col-span-4 bg-white shadow-lg rounded-[2.5rem] flex flex-col items-center justify-center p-4 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-primary/5 group hover:bg-accent"
              >
                <div className="h-16 w-16 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary group-hover:bg-white/20 group-hover:text-white transition-all shadow-sm shrink-0 mb-3">
                  <MapPinPlus className="h-10 w-10" />
                </div>
                <span className="text-sm font-bold tracking-tight text-primary group-hover:text-white transition-colors text-center leading-tight">
                  New trip
                </span>
              </Link>
            </>
          ) : (
            // Phase 1 Launchpad UI: Show prominent CTA if onboarding is complete or family exists
            (hasFamily || onboardingComplete) ? (
              <Card className="col-span-12 border-none shadow-xl rounded-[2.5rem] bg-primary overflow-hidden relative">
                <CardContent className="p-10 flex flex-col items-center text-center space-y-8 relative z-10">
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold text-white tracking-tight leading-tight">
                      Ready to start?
                    </h3>
                    <p className="text-sm text-white/80 font-medium max-w-[260px] mx-auto leading-relaxed">
                      {hasFamily 
                        ? "Your travel group is set up. Create your first trip to start tracking and splitting expenses effortlessly." 
                        : "Ready to start tracking and splitting expenses? Create your first trip in seconds."}
                    </p>
                  </div>
                  
                  <Link href="/trips/new" className="w-full">
                    <Button className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/95 text-lg font-bold shadow-lg shadow-black/10 gap-3 transition-all active:scale-[0.98]">
                      Create your first trip
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
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
            )
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
            {trips.length > 0 ? trips.slice(0, 3).map((trip) => {
              const me = trip.participants?.find((p: any) => p.isUser && p.userId === user?.uid);
              let balance = 0;
              if (me && trip.netBalances) {
                balance = (trip.netBalances[me.id] || 0);
                if (me.familyMembers && Array.isArray(me.familyMembers)) {
                  me.familyMembers.forEach((fm: string) => {
                    balance += (trip.netBalances[`${me.id}-${fm}`] || 0);
                  });
                }
              }

              const tripPastDue = trip.status === 'Active' && trip.endDate && new Date(trip.endDate) < new Date(new Date().setHours(0,0,0,0));

              return (
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
                        "absolute top-4 right-4 border-none backdrop-blur-md font-bold text-[10px] shadow-sm px-3 py-1",
                        tripPastDue ? "bg-accent text-white" : 
                        trip.status === 'Active' ? 'bg-primary/90 text-white' : 
                        trip.status === 'Completed' ? 'bg-secondary text-white' :
                        trip.status === 'Settled' ? 'bg-muted text-muted-foreground' : 
                        'bg-white/90 text-foreground'
                      )}>
                        {trip.status || "Upcoming"}
                      </Badge>
                    </div>
                    <CardHeader className="p-5 space-y-1">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold">{trip.name}</CardTitle>
                        <div className="flex -space-x-1.5 bg-muted/40 p-1.5 rounded-full">
                          {trip.participants?.slice(0, 3).map((p: any, idx: number) => (
                            <Avatar key={idx} className="h-6 w-6 border border-white shadow-sm shrink-0 bg-background">
                              <AvatarImage src={p.avatar} />
                              <AvatarFallback className={cn("text-[8px] font-bold", getAvatarFallbackClasses(p.name, true))}>
                                {getInitials(p.name)}
                              </AvatarFallback>
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
                          balance < -0.01 ? "text-destructive" : balance > 0.01 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {balance < -0.01 ? "-" : balance > 0.01 ? "+" : ""}
                          <span className="font-bold">₹</span>
                          <span className="font-bold">{Math.abs(balance).toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            }) : (
              // Phase 1 Footer logic: Encouragement footer for launchpad
              (hasFamily || onboardingComplete) ? (
                <div className="text-center py-10 opacity-30 select-none animate-in fade-in duration-1000">
                   <PlaneTakeoff className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                   <p className="text-xs font-bold text-muted-foreground">Adventures start with family</p>
                </div>
              ) : (
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
              )
            )}
          </div>
        )}
      </main>

      <OnboardingDialog 
        isOpen={showOnboarding} 
        onOpenChange={(open) => {
          setShowOnboarding(open);
          if (!open) setOnboardingComplete(true); // Treat dismissal as completion to show the Launchpad card
        }}
        onComplete={() => setOnboardingComplete(true)}
      />

      <BottomNav />
    </div>
  );
}
