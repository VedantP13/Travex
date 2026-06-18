
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Globe, 
  MapPin,
  Calendar,
  Wallet,
  Users,
  Loader2,
  Trophy,
  Award,
  Star,
  Receipt,
  Zap,
  Calculator,
  Flame,
  CreditCard,
  Crown,
  History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { useTrips } from "@/context/trips-context";
import { useUser, useFirestore } from "@/firebase";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ReTooltip,
  Legend,
  LabelList
} from "recharts";
import { collection, query, onSnapshot, orderBy, getDocs } from "firebase/firestore";

const COLORS = ['#0B6E82', '#F5A623', '#5B9EAD', '#112240', '#FF7043', '#4DB6AC', '#7986CB'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show labels for very small slices

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-[9px] font-black"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AnalyticsPage() {
  const { trips, loading: tripsLoading } = useTrips();
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedView, setSelectedView] = useState<string>("global");
  const [tripExpenses, setTripExpenses] = useState<any[]>([]);
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);
  const [globalCategoryData, setGlobalCategoryData] = useState<any[]>([]);

  // Fetch expenses for the selected trip
  useEffect(() => {
    if (selectedView === 'global' || !firestore) {
      setTripExpenses([]);
      return;
    }

    setIsExpensesLoading(true);
    const q = query(
      collection(firestore, "trips", selectedView, "expenses"),
      orderBy("date", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setTripExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsExpensesLoading(false);
    }, (err) => {
      console.error(err);
      setIsExpensesLoading(false);
    });

    return () => unsub();
  }, [selectedView, firestore]);

  // Fetch All Expenses for Global Category DNA (One-time fetch when 'global' is selected)
  useEffect(() => {
    if (selectedView !== 'global' || !firestore || !user?.uid || trips.length === 0) return;

    const fetchAllCategories = async () => {
      const counts: Record<string, number> = {};
      
      // We fetch all expenses across all trips the user is in
      // Note: This is an intensive fetch for global insights
      for (const trip of trips) {
        const q = query(collection(firestore, "trips", trip.id, "expenses"));
        const snap = await getDocs(q);
        snap.forEach(d => {
          const data = d.data();
          const cat = data.category || 'Other';
          counts[cat] = (counts[cat] || 0) + (parseFloat(data.amount) || 0);
        });
      }

      const formatted = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      setGlobalCategoryData(formatted);
    };

    fetchAllCategories();
  }, [selectedView, firestore, user?.uid, trips]);

  // Global Logic
  const globalStats = useMemo(() => {
    return trips.reduce((acc, trip) => {
      acc.totalSpent += (trip.totalSpent || 0);

      // Track the "Big One"
      if (trip.totalSpent > acc.maxTrip.amount) {
        acc.maxTrip = { name: trip.name, amount: trip.totalSpent };
      }

      // Track Persona (Style)
      const hint = trip.imageHint?.toLowerCase() || "";
      if (hint.includes('beach') || hint.includes('tropical')) acc.styleCounts.Beach++;
      else if (hint.includes('mountain') || hint.includes('trek')) acc.styleCounts.Mountain++;
      else if (hint.includes('city') || hint.includes('urban')) acc.styleCounts.Urban++;
      else acc.styleCounts.Other++;

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
    }, { 
      totalSpent: 0, 
      netStanding: 0, 
      maxTrip: { name: "None", amount: 0 },
      styleCounts: { Beach: 0, Mountain: 0, Urban: 0, Other: 0 }
    });
  }, [trips, user?.uid]);

  const travelPersona = useMemo(() => {
    const styles = globalStats.styleCounts;
    const max = Math.max(styles.Beach, styles.Mountain, styles.Urban);
    if (max === 0) return "Explorer";
    if (styles.Beach === max) return "Beach Soul";
    if (styles.Mountain === max) return "Summit Seeker";
    if (styles.Urban === max) return "City Nomad";
    return "Explorer";
  }, [globalStats]);

  // Chart Data: Global - Spend per Trip
  const globalComparisonData = useMemo(() => {
    return [...trips]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5)
      .map(t => ({
        name: t.name.length > 10 ? t.name.substring(0, 10) + '...' : t.name,
        amount: t.totalSpent || 0
      }));
  }, [trips]);

  // Selected Trip Logic
  const selectedTrip = useMemo(() => {
    if (selectedView === 'global') return null;
    return trips.find(t => t.id === selectedView);
  }, [trips, selectedView]);

  const tripStats = useMemo(() => {
    if (!selectedTrip || !tripExpenses.length) return null;
    
    let tripBalance = 0;
    const me = selectedTrip.participants?.find((p: any) => p.isUser && p.userId === user?.uid);
    if (me) {
      tripBalance = selectedTrip.netBalances?.[me.id] || 0;
      me.familyMembers?.forEach((fm: string) => {
        tripBalance += (selectedTrip.netBalances?.[`${me.id}-${fm}`] || 0);
      });
    }

    const highestExpense = tripExpenses.reduce((prev, curr) => 
      (parseFloat(curr.amount) > parseFloat(prev.amount) ? curr : prev), tripExpenses[0]);

    // Payment DNA
    const pCounts: Record<string, number> = {};
    tripExpenses.forEach(e => {
      const pType = e.paymentType || 'Other';
      pCounts[pType] = (pCounts[pType] || 0) + 1;
    });
    const topPayment = Object.entries(pCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    return {
      totalSpent: selectedTrip.totalSpent || 0,
      netStanding: tripBalance,
      memberCount: selectedTrip.participants?.length || 0,
      billsCount: tripExpenses.length,
      highestBill: parseFloat(highestExpense.amount) || 0,
      topPayment: topPayment
    };
  }, [selectedTrip, tripExpenses, user?.uid]);

  // Chart Data: Category Mix
  const categoryData = useMemo(() => {
    if (selectedView === 'global') {
      return globalCategoryData;
    }
    const counts: Record<string, number> = {};
    tripExpenses.forEach(exp => {
      const cat = exp.category || 'Other';
      counts[cat] = (counts[cat] || 0) + (parseFloat(exp.amount) || 0);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [tripExpenses, selectedView, globalCategoryData]);

  // Chart Data: Specific Trip - Time Trend
  const timeTrendData = useMemo(() => {
    if (selectedView === 'global') return [];
    
    const dayMap: Record<string, number> = {};
    tripExpenses.forEach(exp => {
      if (!exp.date) return;
      const dateLabel = new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      dayMap[dateLabel] = (dayMap[dateLabel] || 0) + (parseFloat(exp.amount) || 0);
    });
    return Object.entries(dayMap).map(([name, amount]) => ({ name, amount }));
  }, [tripExpenses, selectedView]);

  // Social Insights
  const { socialInsights, maxVal } = useMemo(() => {
    if (selectedView === 'global') {
      const partnerCounts: Record<string, { count: number, avatar: string, name: string }> = {};
      trips.forEach(trip => {
        trip.participants?.forEach((p: any) => {
          if (p.isUser && p.userId === user?.uid) return;
          if (!partnerCounts[p.name]) {
            partnerCounts[p.name] = { count: 0, avatar: p.avatar, name: p.name };
          }
          partnerCounts[p.name].count += 1;
        });
      });
      const items = Object.values(partnerCounts).sort((a, b) => b.count - a.count).slice(0, 3);
      const maxVal = items.length > 0 ? items[0].count : 0;

      const insights = items.map(item => ({
        ...item,
        smartDetail: `${((item.count / (trips.length || 1)) * 100).toFixed(0)}% of your journeys`
      }));

      return { socialInsights: insights, maxVal };
    } else {
      const payerTotals: Record<string, { amount: number, avatar: string, name: string, bills: number }> = {};
      tripExpenses.forEach(exp => {
        if (!payerTotals[exp.payerName]) {
          const p = selectedTrip?.participants?.find((part: any) => part.name === exp.payerName);
          payerTotals[exp.payerName] = { amount: 0, avatar: p?.avatar || "", name: exp.payerName, bills: 0 };
        }
        payerTotals[exp.payerName].amount += (parseFloat(exp.amount) || 0);
        payerTotals[exp.payerName].bills += 1;
      });
      const items = Object.values(payerTotals).sort((a, b) => b.amount - a.amount).slice(0, 3);
      const maxVal = items.length > 0 ? items[0].amount : 0;
      
      const tripTotal = selectedTrip?.totalSpent || 1;
      const insights = items.map(item => ({
        ...item,
        smartDetail: `Covered ${((item.amount / tripTotal) * 100).toFixed(0)}% of costs`
      }));

      return { socialInsights: insights, maxVal };
    }
  }, [selectedView, trips, tripExpenses, user?.uid, selectedTrip]);

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
                {selectedView === 'global' ? <Globe className="h-3 w-3 text-accent" /> : < MapPin className="h-3 w-3 text-accent" />}
                <SelectValue placeholder="View" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-[1.5rem] border-none shadow-2xl bg-white p-2">
              <SelectItem value="global" className="rounded-xl text-[10px] font-bold py-3 uppercase tracking-widest cursor-pointer">
                All Trips
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
            ? `Lifetime spending across ${trips.length} journeys.` 
            : `Deep dive into ${selectedTrip?.name || 'this journey'}.`}
        </p>
      </header>

      <main className="px-safe-pad pt-6 space-y-6">
        {!hasTrips && !tripsLoading ? (
          <div className="text-center py-20 space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
              <BarChart3 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold">No data yet</h2>
            <p className="text-sm text-muted-foreground px-10 leading-relaxed">
              Create your first trip and add expenses to see your analytics.
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
                    {selectedView === 'global' ? 'Lifetime budget' : 'Utilized'}
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

            {selectedView === 'global' ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Card className="border-none shadow-sm bg-primary/5 rounded-3xl overflow-hidden">
                   <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                         <Crown className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[8px] font-black uppercase text-primary/60 tracking-wider">Style</p>
                         <p className="text-xs font-bold text-primary truncate">{travelPersona}</p>
                      </div>
                   </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-accent/5 rounded-3xl overflow-hidden">
                   <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                         <Flame className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[8px] font-black uppercase text-accent/60 tracking-wider">Peak Spend</p>
                         <p className="text-xs font-bold text-accent truncate">₹{globalStats.maxTrip.amount.toLocaleString()}</p>
                      </div>
                   </CardContent>
                </Card>
              </div>
            ) : tripStats && (
              <div className="grid grid-cols-3 gap-3 mb-6 animate-in zoom-in-95 duration-300">
                <div className="bg-white/50 border border-muted/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                   <Users className="h-4 w-4 text-muted-foreground mb-1" />
                   <p className="text-sm font-black leading-none">{tripStats.memberCount}</p>
                   <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">People</p>
                </div>
                <div className="bg-white/50 border border-muted/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                   <Receipt className="h-4 w-4 text-muted-foreground mb-1" />
                   <p className="text-sm font-black leading-none">{tripStats.billsCount}</p>
                   <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Bills</p>
                </div>
                <div className="bg-white/50 border border-muted/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                   <Calculator className="h-4 w-4 text-muted-foreground mb-1" />
                   <p className="text-sm font-black leading-none">
                     ₹{(tripStats.totalSpent / (tripStats.billsCount || 1)).toFixed(0)}
                   </p>
                   <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 whitespace-nowrap">Avg. Bill</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Category Breakdown Chart */}
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardHeader className="pb-0 pt-6">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/40 text-center">
                    Spending DNA
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {isExpensesLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : categoryData.length > 0 ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="45%"
                            innerRadius={65}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            labelLine={false}
                            label={renderCustomizedLabel}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center bg-muted/5 rounded-2xl border-2 border-dashed border-muted/20">
                       <PieChartIcon className="h-8 w-8 text-muted-foreground/20 mb-2" />
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">Calculating patterns...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Behavioral Details (Specific View) */}
              {selectedView !== 'global' && tripStats && (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-none shadow-sm bg-white rounded-3xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                       <Zap className="h-3.5 w-3.5 text-accent" />
                       <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Peak Moment</span>
                    </div>
                    <p className="text-xl font-black text-foreground">₹{tripStats.highestBill.toLocaleString()}</p>
                    <p className="text-[8px] text-muted-foreground mt-1 font-bold">Highest single bill</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-white rounded-3xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                       <CreditCard className="h-3.5 w-3.5 text-primary" />
                       <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Payment DNA</span>
                    </div>
                    <p className="text-xl font-black text-foreground">{tripStats.topPayment}</p>
                    <p className="text-[8px] text-muted-foreground mt-1 font-bold">Most used method</p>
                  </Card>
                </div>
              )}

              {/* Social Insights Section */}
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardHeader className="pb-2 pt-6">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/40 text-center">
                    {selectedView === 'global' ? 'Top Companions' : 'Contribution Rank'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {socialInsights.length > 0 ? (
                    <div className="space-y-4">
                      {socialInsights.map((item: any, idx: number) => {
                        const isWinner = selectedView === 'global' 
                          ? item.count === maxVal 
                          : item.amount === maxVal;

                        return (
                          <div key={idx} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarImage src={item.avatar} />
                                  <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">{item.name[0]}</AvatarFallback>
                                </Avatar>
                                {isWinner && (
                                  <div className="absolute -top-1 -right-1 bg-accent rounded-full p-0.5 border-2 border-white shadow-sm">
                                    <Trophy className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground leading-tight">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {item.smartDetail}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-black text-primary">
                                 {selectedView === 'global' 
                                   ? `${item.count} ${item.count === 1 ? 'Trip' : 'Trips'}` 
                                   : `₹${item.amount.toLocaleString()}`}
                               </p>
                               <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                                 {selectedView === 'global' ? 'Shared' : 'Spent'}
                               </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 opacity-30">
                       <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                       <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting connections</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Spending Trends Chart */}
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardHeader className="pb-2 pt-6">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/40 text-center">
                    {selectedView === 'global' ? 'Budget Distribution' : 'Spending Timeline'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedView === 'global' ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={globalComparisonData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700 }}
                          />
                          <YAxis hide />
                          <ReTooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar 
                            dataKey="amount" 
                            fill="#0B6E82" 
                            radius={[8, 8, 0, 0]}
                            barSize={30}
                          >
                            <LabelList 
                              dataKey="amount" 
                              position="top" 
                              offset={8}
                              style={{ fill: '#112240', fontSize: 9, fontWeight: 900 }}
                              formatter={(val: number) => `₹${val.toLocaleString()}`}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      {isExpensesLoading ? (
                        <div className="h-full flex items-center justify-center">
                           <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : timeTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timeTrendData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 700 }}
                            />
                            <YAxis hide />
                            <ReTooltip 
                              cursor={{ fill: 'transparent' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill="#F5A623" 
                              radius={[8, 8, 0, 0]}
                              barSize={20}
                            >
                              <LabelList 
                                dataKey="amount" 
                                position="top" 
                                offset={8}
                                style={{ fill: '#112240', fontSize: 9, fontWeight: 900 }}
                                formatter={(val: number) => `₹${val.toLocaleString()}`}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-muted/5 rounded-2xl border-2 border-dashed border-muted/20">
                          <BarChart3 className="h-8 w-8 text-muted-foreground/20 mb-2" />
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">History being made...</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
