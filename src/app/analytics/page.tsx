
"use client";

import { useMemo } from "react";
import { BarChart3, TrendingDown, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { useTrips } from "@/context/trips-context";
import { useUser } from "@/firebase";

export default function AnalyticsPage() {
  const { trips, loading } = useTrips();
  const { user } = useUser();

  const { totalSpent, netStanding } = useMemo(() => {
    return trips.reduce((acc, trip) => {
      // Aggregate total spent across all trips
      acc.totalSpent += (trip.totalSpent || 0);

      // Aggregate net standing for active/completed (excluding settled)
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

  const hasTrips = trips.length > 0;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-10 bg-foreground text-background rounded-b-[2.5rem] shadow-lg shadow-black/10">
        <h1 className="text-3xl font-bold tracking-tight text-background">
          Analytics
        </h1>
        <p className="text-sm opacity-70 mt-1 font-medium text-background">
          Your spending patterns at a glance
        </p>
      </header>

      <main className="px-safe-pad pt-6 space-y-6">
        {!hasTrips && !loading ? (
          <div className="text-center py-20 space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
              <BarChart3 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold">No data yet</h2>
            <p className="text-sm text-muted-foreground px-10">
              Create your first trip and add expenses to see your spending analytics.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-white rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total spent</span>
                  </div>
                  <p className="text-xl font-bold">₹{totalSpent.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Across {trips.length} journeys</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white rounded-2xl">
                <CardContent className="p-4">
                  <div className={`flex items-center gap-2 mb-1 ${netStanding >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {netStanding >= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">Net Balance</span>
                  </div>
                  <p className="text-xl font-bold">₹{Math.abs(netStanding).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {netStanding >= 0 ? 'Owed to you' : 'You owe'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">
                  Spending Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-32 flex items-center justify-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted/50">
                  <p className="text-xs text-muted-foreground font-medium italic">Detailed category charts will appear as you tag more expenses.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
