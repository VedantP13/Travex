
"use client";

import { useState, useMemo } from "react";
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  ChevronDown, 
  Globe, 
  MapPin,
  Calendar,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { useTrips } from "@/context/trips-context";
import { useUser } from "@/firebase";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const { trips, loading } = useTrips();
  const { user } = useUser();
  const [selectedView, setSelectedView] = useState<string>("global");

  // Logic for Global Metrics
  const globalStats = useMemo(() => {
    return trips.reduce((acc, trip) => {
      acc.totalSpent += (trip.totalSpent || 0);

      if (trip.status !== 'Settled') {
        const me = trip.participants?.find((p: any) => p.isUser && p.userId === user?.uid);
        if (me) {
          let tripBalance = trip.netBalances?.[me.id] || 0;
          me.familyMembers?.forEach((fm: string) => {
            tripBalance += (trip.netBalances?.[`${me.id}-${fm}`] || 0);
          });
          acc.netStanding += tripBalance;
        }
      }
      return acc;
    }, { totalSpent: 0, netStanding: 0 });
  }, [trips, user?.uid]);

  // Logic for Specific Trip Metrics
  const selectedTrip = useMemo(() => {
    if (selectedView === 'global') return null;
    return trips.find(t => t.id === selectedView);
  }, [trips, selectedView]);

  const tripStats = useMemo(() => {
    if (!selectedTrip) return null;
    
    let tripBalance = 0;
    const me = selectedTrip.participants?.find((p: any) => p.isUser && p.userId === user?.uid);
    if (me) {
      tripBalance = selectedTrip.netBalances?.[me.id] || 0;
      me.familyMembers?.forEach((fm: string) => {
        tripBalance += (selectedTrip.netBalances?.[`${me.id}-${fm}`] || 0);
      });
    }

    return {
      totalSpent: selectedTrip.totalSpent || 0,
      netStanding: tripBalance,
      memberCount: selectedTrip.participants?.length || 0,
      date: selectedTrip.date || "Ongoing"
    };
  }, [selectedTrip, user?.uid]);

  const displayTotal = selectedView === 'global' ? globalStats.totalSpent : (tripStats?.totalSpent || 0);
  const displayBalance = selectedView === 'global' ? globalStats.netStanding : (tripStats?.netStanding || 0);

  const hasTrips = trips.length > 0;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-32">
      <header className="px-safe-pad pt-12 pb-10 bg-foreground text-background rounded-b-[2.5rem] shadow-lg shadow-black/10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-background">
            Analytics
          </h1>
          
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-auto min-w-[140px] h-10 rounded-2xl border-none bg-white/10 text-white font-bold text-[10px] hover:bg-white/20 transition-all shadow-sm focus:ring-0 px-4 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                {selectedView === 'global' ? <Globe className="h-3 w-3 text-accent" /> : <MapPin className="h-3 w-3 text-accent" />}
                <SelectValue placeholder="View" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-[1.5rem] border-none shadow-2xl bg-white p-2">
              <SelectItem value="global" className="rounded-xl text-[10px] font-bold py-3 uppercase tracking-widest cursor-pointer">
                Global Pulse
              </SelectItem>
              {trips.map(trip => (
                <SelectItem key={trip.id} value={trip.id} className="rounded-xl text-[10px] font-bold py-3 uppercase tracking-widest cursor-pointer">
                  {trip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <p className="text-xs opacity-60 font-medium text-background leading-relaxed pr-10">
          {selectedView === 'global' 
            ? "Your consolidated travel economy across all active adventures." 
            : `Deep dive into ${selectedTrip?.name || 'this journey'}'s spending patterns.`}
        </p>
      </header>

      <main className="px-safe-pad pt-6 space-y-6">
        {!hasTrips && !loading ? (
          <div className="text-center py-20 space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
              <BarChart3 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold">No data yet</h2>
            <p className="text-sm text-muted-foreground px-10 leading-relaxed">
              Create your first trip and add expenses to see your spending analytics.
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <div className="h-6 w-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Wallet className="h-3 w-3" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Total spent</span>
                  </div>
                  <p className="text-2xl font-black tracking-tight text-foreground leading-none">
                    ₹{displayTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">
                    {selectedView === 'global' ? `Across ${trips.length} journeys` : `Budget utilized`}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardContent className="p-5">
                  <div className={cn(
                    "flex items-center gap-2 mb-2",
                    displayBalance >= 0 ? 'text-primary' : 'text-accent'
                  )}>
                    <div className={cn(
                      "h-6 w-6 rounded-lg flex items-center justify-center",
                      displayBalance >= 0 ? 'bg-primary/10' : 'bg-accent/10'
                    )}>
                      {displayBalance >= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Net Standing</span>
                  </div>
                  <p className="text-2xl font-black tracking-tight text-foreground leading-none">
                    ₹{Math.abs(displayBalance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">
                    {displayBalance >= 0 ? 'Owed to you' : 'You owe'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {selectedView !== 'global' && tripStats && (
              <div className="grid grid-cols-3 gap-3 mb-6 animate-in zoom-in-95 duration-300">
                <div className="bg-white/50 border border-muted/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                   <Users className="h-3 w-3 text-muted-foreground mb-1" />
                   <p className="text-[10px] font-black leading-none">{tripStats.memberCount}</p>
                   <p className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">Groups</p>
                </div>
                <div className="bg-white/50 border border-muted/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                   <Calendar className="h-3 w-3 text-muted-foreground mb-1" />
                   <p className="text-[10px] font-black leading-none truncate w-full px-1">{tripStats.date.split('-')[0]}</p>
                   <p className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">Start</p>
                </div>
                <div className="bg-white/50 border border-muted/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                   <div className="h-1.5 w-1.5 rounded-full bg-primary mb-1 animate-pulse" />
                   <p className="text-[10px] font-black leading-none uppercase">{selectedTrip?.status}</p>
                   <p className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">Status</p>
                </div>
              </div>
            )}

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-black uppercase tracking-widest text-foreground/40">
                  Visual Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-40 flex flex-col items-center justify-center bg-muted/10 rounded-2xl border-2 border-dashed border-muted/30">
                  <PieChartIcon className="h-8 w-8 text-muted-foreground/20 mb-2" />
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter italic">
                    Coming in Phase 2: Category Mix & Charts
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
