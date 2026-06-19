'use client';

import { 
  TrendingDown, 
  TrendingUp, 
  ArrowRight, 
  TrendingUp as TrendingUpIcon, 
  Activity, 
  Info,
  Crown,
  Tag,
  Receipt,
  RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { getInitials, getAvatarFallbackClasses } from "@/lib/avatar-utils";

interface TripBalancesProps {
  groupedStandings: any[];
  suggestedPayments: any[];
  expenses: any[];
}

export function TripBalances({ groupedStandings, suggestedPayments, expenses }: TripBalancesProps) {
  const insights = useMemo(() => {
    if (!expenses.length) return null;

    // Top Payer
    const payerTotals: Record<string, { amount: number, name: string }> = {};
    expenses.forEach(e => {
      payerTotals[e.payerId] = {
        amount: (payerTotals[e.payerId]?.amount || 0) + (parseFloat(e.amount) || 0),
        name: e.payerName
      };
    });
    const topPayer = Object.values(payerTotals).sort((a, b) => b.amount - a.amount)[0];

    // Top Category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return {
      topPayer: topPayer?.name?.split(' ')[0] || "N/A",
      topCategory: topCategory?.[0] || "N/A",
      totalCount: expenses.length
    };
  }, [expenses]);

  return (
    <div className="mt-6 space-y-6 pb-24">
      {groupedStandings.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-primary/5">
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <TrendingDown className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Owed</span>
              </div>
              <p className="text-lg font-bold">₹{groupedStandings.reduce((acc, s) => s.netTotal > 0 ? acc + s.netTotal : acc, 0).toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-destructive/5">
              <div className="flex items-center gap-1.5 text-destructive mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Debt</span>
              </div>
              <p className="text-lg font-bold">₹{Math.abs(groupedStandings.reduce((acc, s) => s.netTotal < -0.01 ? acc + s.netTotal : acc, 0)).toFixed(2)}</p>
            </div>
          </div>

          {suggestedPayments.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h2 className="text-xs font-semibold text-accent tracking-widest px-1 uppercase">How to settle up</h2>
              <Card className="border-none shadow-xl bg-accent/5 rounded-[2rem] overflow-hidden border-2 border-dashed border-accent/20">
                <CardContent className="p-6 space-y-4">
                  {suggestedPayments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white shadow-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 border shadow-sm">
                          <AvatarImage src={p.fromAvatar} />
                          <AvatarFallback className={getAvatarFallbackClasses(p.from)}>
                            {getInitials(p.from)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-bold truncate">{p.from.split(' ')[0]}</p>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1 shrink-0">
                         <p className="text-[10px] font-extrabold text-accent">₹{p.amount.toFixed(0)}</p>
                         <ArrowRight className="h-3 w-3 text-accent/40" strokeWidth={3} />
                      </div>

                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <p className="text-xs font-bold truncate">{p.to.split(' ')[0]}</p>
                        <Avatar className="h-8 w-8 border shadow-sm">
                          <AvatarImage src={p.toAvatar} />
                          <AvatarFallback className={getAvatarFallbackClasses(p.to)}>
                            {getInitials(p.to)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  ))}
                  <p className="text-[9px] text-center text-muted-foreground/60 font-medium px-4">
                    Follow these transfers to bring everyone's balance to zero efficiently.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <h2 className="text-xs font-semibold text-foreground/60 tracking-widest px-1 uppercase mb-2">Net standing</h2>
          <div className="grid gap-3">
            {groupedStandings.map((standing) => {
              const isPositive = standing.netTotal > 0.01;
              const isNegative = standing.netTotal < -0.01;
              const isZero = !isPositive && !isNegative;
              
              const familyDisplayName = standing.isMe 
                ? "Your family" 
                : `${standing.name}'s family`;

              return (
                <Card key={standing.id} className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden group hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-white shadow-md shrink-0">
                            <AvatarImage src={standing.avatar} className="object-cover" />
                            <AvatarFallback className={getAvatarFallbackClasses(standing.name)}>
                              {getInitials(standing.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base truncate text-foreground">{familyDisplayName}</h3>
                          <p className={cn(
                            "text-[10px] font-extrabold uppercase tracking-widest mt-0.5 flex items-center gap-1",
                            isPositive ? "text-primary" : isNegative ? "text-accent" : "text-muted-foreground"
                          )}>
                            {isPositive ? <TrendingDown className="h-3 w-3" /> : isNegative ? <TrendingUpIcon className="h-3 w-3" /> : null}
                            {isPositive ? 'Is owed' : isNegative ? 'Owes' : 'Perfectly settled'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-lg font-black tracking-tight",
                          isPositive ? "text-primary" : isZero ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {isZero ? '—' : `₹${Math.abs(standing.netTotal).toFixed(2)}`}
                        </p>
                        {standing.familyCount > 1 && (
                          <p className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                            {standing.familyCount} members
                          </p>
                        )}
                      </div>
                    </div>

                    {standing.familyCount > 1 && (
                      <Accordion type="single" collapsible className="border-t border-muted/20">
                        <AccordionItem value="breakdown" className="border-none">
                          <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/10 group">
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest group-hover:text-primary transition-colors">
                              View breakdown
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-5">
                            <div className="space-y-3 pt-1">
                              {standing.breakdown.map((b: any, idx: number) => {
                                const bPos = b.balance > 0.01;
                                const bNeg = b.balance < -0.01;
                                return (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                                      <span className="font-semibold text-foreground/80">{b.name}</span>
                                    </div>
                                    <span className={cn(
                                      "font-bold",
                                      bPos ? "text-primary" : bNeg ? "text-accent" : "text-muted-foreground/40"
                                    )}>
                                      {bPos ? '+' : bNeg ? '-' : ''}₹{Math.abs(b.balance).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {insights && (
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-muted/30">
               <div className="bg-primary/5 rounded-2xl p-3 flex flex-col items-center text-center">
                  <Crown className="h-3.5 w-3.5 text-primary mb-1.5" />
                  <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none mb-1">Top Payer</p>
                  <p className="text-[10px] font-black text-primary truncate w-full">{insights.topPayer}</p>
               </div>
               <div className="bg-accent/5 rounded-2xl p-3 flex flex-col items-center text-center">
                  <Tag className="h-3.5 w-3.5 text-accent mb-1.5" />
                  <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none mb-1">Main Category</p>
                  <p className="text-[10px] font-black text-accent truncate w-full">{insights.topCategory}</p>
               </div>
               <div className="bg-muted/30 rounded-2xl p-3 flex flex-col items-center text-center">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/60 mb-1.5" />
                  <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none mb-1">Total Bills</p>
                  <p className="text-[10px] font-black text-foreground">{insights.totalCount}</p>
               </div>
            </div>
          )}

          <div className="mt-8 bg-muted/20 rounded-3xl p-5 border border-dashed border-muted/50">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                Calculations are optimized for simplicity. Use the "Sync balances" tool in settings to repair historical split issues.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/50 px-10">
           <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
             <Activity className="h-7 w-7 text-primary/40" />
           </div>
           <h3 className="text-lg font-bold text-foreground tracking-tight">Balance summaries</h3>
           <p className="text-sm text-muted-foreground mt-1 leading-relaxed px-4">Calculated debt and credit standings will appear as you finalize expense splits.</p>
        </div>
      )}
    </div>
  );
}
