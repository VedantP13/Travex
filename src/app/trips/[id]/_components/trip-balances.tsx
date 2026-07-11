'use client';

import { useState, useMemo } from "react";
import { 
  ArrowRight, 
  Activity, 
  Crown,
  Tag,
  ChevronRight,
  ReceiptText,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarFallbackClasses } from "@/lib/avatar-utils";

interface TripBalancesProps {
  groupedStandings: any[];
  suggestedPayments: any[];
  expenses: any[];
}

export function TripBalances({ groupedStandings, suggestedPayments, expenses }: TripBalancesProps) {
  const [selectedMember, setSelectedMember] = useState<{ id: string, name: string } | null>(null);
  const [showSettlementDetail, setShowSettlementDetail] = useState(false);

  // User specific summary logic
  const { userToReceive, userToPay } = useMemo(() => {
    const myStanding = groupedStandings.find(s => s.isMe);
    if (!myStanding) return { userToReceive: 0, userToPay: 0 };
    
    const balance = myStanding.netTotal;
    return {
      userToReceive: balance > 0.01 ? balance : 0,
      userToPay: balance < -0.01 ? Math.abs(balance) : 0
    };
  }, [groupedStandings]);

  // Participant Map for the Audit View
  const participantsMap = useMemo(() => {
    const map: Record<string, { name: string, avatar: string }> = {};
    groupedStandings.forEach(s => {
      map[s.id] = { name: s.name, avatar: s.avatar };
      s.breakdown.forEach((b: any) => {
        map[b.id] = { name: b.name, avatar: s.avatar };
      });
    });
    return map;
  }, [groupedStandings]);

  const insights = useMemo(() => {
    if (!expenses.length) return null;

    const payerTotals: Record<string, { amount: number, name: string }> = {};
    expenses.forEach(e => {
      if (e.splitType === 'unsplit') return;
      payerTotals[e.payerId] = {
        amount: (payerTotals[e.payerId]?.amount || 0) + (parseFloat(e.amount) || 0),
        name: e.payerName
      };
    });
    const topPayer = Object.values(payerTotals).sort((a, b) => b.amount - a.amount)[0];

    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.splitType === 'unsplit') return;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return {
      topPayer: topPayer?.name?.split(' ')[0] || "N/A",
      topCategory: topCategory?.[0] || "N/A",
      totalCount: expenses.filter(e => e.splitType !== 'unsplit').length
    };
  }, [expenses]);

  const memberHistory = useMemo(() => {
    if (!selectedMember || !expenses.length) return [];

    const history: any[] = [];
    expenses.forEach(exp => {
      if (exp.splitType === 'unsplit') return;
      
      const mid = selectedMember.id;
      const isPayer = exp.payerId === mid;
      const selected = exp.selectedIndividuals || [];
      const isInvolved = selected.includes(mid);
      
      if (!isPayer && !isInvolved) return;

      let shareAmt = 0;
      if (isInvolved) {
        const amount = parseFloat(exp.amount) || 0;
        if (exp.splitType === 'equal_person') {
          shareAmt = amount / (selected.length || 1);
        } else if (exp.splitType === 'equal_family') {
          const targetParentId = mid.split('-')[0];
          const families = new Set(selected.map((sid: string) => sid.split('-')[0]));
          const sharePerFamily = amount / (families.size || 1);
          const membersInThisFamily = selected.filter((sid: string) => sid.split('-')[0] === targetParentId);
          shareAmt = sharePerFamily / (membersInThisFamily.length || 1);
        } else if (exp.splitType === 'custom') {
          shareAmt = parseFloat(exp.customAmounts?.[mid]) || 0;
        } else if (exp.splitType === 'just_me') {
          shareAmt = amount;
        }
      }

      history.push({
        id: exp.id,
        date: exp.date,
        description: exp.description,
        payer: exp.payerName,
        paid: isPayer ? parseFloat(exp.amount) : 0,
        share: shareAmt,
        net: (isPayer ? parseFloat(exp.amount) : 0) - shareAmt
      });
    });

    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedMember, expenses]);

  const totals = useMemo(() => {
    return memberHistory.reduce((acc, h) => ({
      paid: acc.paid + h.paid,
      share: acc.share + h.share,
      net: acc.net + h.net
    }), { paid: 0, share: 0, net: 0 });
  }, [memberHistory]);

  const auditExpenses = useMemo(() => {
    return [...expenses]
      .filter(e => e.splitType !== 'unsplit')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  return (
    <div className="mt-6 space-y-6 pb-24">
      {groupedStandings.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-primary/5">
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <ArrowDownLeft className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">To Receive</span>
              </div>
              <p className="text-xl font-black text-primary">₹{userToReceive.toFixed(0)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-destructive/5">
              <div className="flex items-center gap-1.5 text-accent mb-1">
                <ArrowUpRight className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">To Pay</span>
              </div>
              <p className="text-xl font-black text-accent">₹{userToPay.toFixed(0)}</p>
            </div>
          </div>

          {suggestedPayments.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Settlement Plan</h2>
              </div>
              <Card className="border-none shadow-xl bg-accent/5 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-accent/20">
                <CardContent className="p-6 space-y-4">
                  {suggestedPayments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm group transition-all hover:shadow-md">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                          <AvatarImage src={p.fromAvatar} className="object-cover" />
                          <AvatarFallback className={getAvatarFallbackClasses(p.from)}>
                            {getInitials(p.from)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black truncate text-foreground">{p.from.split(' ')[0]}</p>
                          <p className="text-[8px] font-bold text-accent/60 uppercase tracking-tighter">Pays</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                         <span className="text-xs font-black text-foreground">₹{p.amount.toFixed(0)}</span>
                         <ArrowRight className="h-6 w-6 text-accent animate-pulse" strokeWidth={2.5} />
                      </div>

                      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end text-right">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black truncate text-foreground">{p.to.split(' ')[0]}</p>
                          <p className="text-[8px] font-bold text-primary/60 uppercase tracking-tighter">Receives</p>
                        </div>
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                          <AvatarImage src={p.toAvatar} className="object-cover" />
                          <AvatarFallback className={getAvatarFallbackClasses(p.to)}>
                            {getInitials(p.to)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2">
                    <Button 
                      variant="ghost" 
                      className="w-full h-11 rounded-2xl bg-white/40 hover:bg-white/60 text-[10px] font-black text-primary transition-all border border-white/20 uppercase tracking-widest"
                      onClick={() => setShowSettlementDetail(true)}
                    >
                      Detailed View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-muted-foreground tracking-[0.2em] px-1 uppercase">Member Standings</h2>
            <div className="grid gap-4">
              {groupedStandings.map((standing) => {
                const isPositive = standing.netTotal > 0.01;
                const isNegative = standing.netTotal < -0.01;
                const isZero = !isPositive && !isNegative;
                
                const displayName = standing.isMe 
                  ? (standing.isSolo ? "You" : "Your family") 
                  : (standing.isSolo ? standing.name : `${standing.name}'s family`);

                const statusLabel = isPositive ? "Gets back" : isNegative ? "Needs to pay" : "Settled up";

                return (
                  <Card key={standing.id} className={cn(
                    "border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:shadow-md border",
                    standing.isMe ? "border-primary/20 ring-1 ring-primary/5" : "border-muted/20"
                  )}>
                    <CardContent className="p-0">
                      <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative">
                            <Avatar className="h-14 w-14 border-4 border-muted/10 shadow-md shrink-0">
                              <AvatarImage src={standing.avatar} className="object-cover" />
                              <AvatarFallback className={getAvatarFallbackClasses(standing.name)}>
                                {getInitials(standing.name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                               <h3 className="font-bold text-base truncate text-foreground">{displayName}</h3>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                               <Badge className={cn(
                                 "text-[8px] font-black px-2 py-0.5 border-none tracking-widest uppercase",
                                 isPositive ? "bg-primary text-white" : isNegative ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                               )}>
                                 {statusLabel}
                               </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "text-2xl font-black tracking-tighter leading-none",
                            isPositive ? "text-primary" : isZero ? "text-muted-foreground/30" : "text-foreground"
                          )}>
                            {isZero ? '₹0' : `₹${Math.abs(standing.netTotal).toFixed(0)}`}
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Standing</p>
                        </div>
                      </div>

                      <div className="px-6 py-5 bg-muted/10 border-t border-muted/20 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                 <span>Paid</span>
                                 <span>₹{standing.totalPaid.toFixed(0)}</span>
                              </div>
                              <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-primary transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (standing.totalPaid / (standing.totalPaid + standing.totalShare || 1)) * 200)}%` }}
                                 />
                              </div>
                           </div>
                           <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                 <span>Share</span>
                                 <span>₹{standing.totalShare.toFixed(0)}</span>
                              </div>
                              <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-accent transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (standing.totalShare / (standing.totalPaid + standing.totalShare || 1)) * 200)}%` }}
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                          {standing.breakdown.map((b: any, idx: number) => {
                            const bPos = b.balance > 0.01;
                            const bNeg = b.balance < -0.01;
                            return (
                              <div 
                                key={idx} 
                                className="flex justify-between items-center bg-white/60 p-3 rounded-2xl border border-muted/20 shadow-sm active:scale-[0.98] transition-all cursor-pointer group hover:border-primary/20 hover:shadow-md"
                                onClick={() => setSelectedMember({ id: b.id, name: b.name })}
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-[11px] text-foreground block truncate group-hover:text-primary transition-colors">{b.name}</span>
                                  <p className="text-[8px] text-muted-foreground/60 font-black uppercase tracking-tighter">
                                    Paid ₹{b.paid.toFixed(0)} • Share ₹{b.share.toFixed(0)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-black text-[11px]",
                                    bPos ? "text-primary" : bNeg ? "text-accent" : "text-muted-foreground/30"
                                  )}>
                                    {bPos ? '+' : bNeg ? '-' : ''}₹{Math.abs(b.balance).toFixed(0)}
                                  </span>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {insights && (
            <div className="grid grid-cols-3 gap-2 mt-8 pt-6 border-t border-muted/30">
               <div className="bg-primary/5 rounded-2xl p-4 flex flex-col items-center text-center">
                  <Crown className="h-4 w-4 text-primary mb-2" />
                  <p className="text-[8px] font-black text-muted-foreground uppercase leading-none mb-1">Top Payer</p>
                  <p className="text-[11px] font-black text-primary truncate w-full">{insights.topPayer}</p>
               </div>
               <div className="bg-accent/5 rounded-2xl p-4 flex flex-col items-center text-center">
                  <Tag className="h-4 w-4 text-accent mb-2" />
                  <p className="text-[8px] font-black text-muted-foreground uppercase leading-none mb-1">Main Hit</p>
                  <p className="text-[11px] font-black text-accent truncate w-full">{insights.topCategory}</p>
               </div>
               <div className="bg-muted/30 rounded-2xl p-4 flex flex-col items-center text-center">
                  <Calculator className="h-4 w-4 text-muted-foreground/60 mb-2" />
                  <p className="text-[8px] font-black text-muted-foreground uppercase leading-none mb-1">Activity</p>
                  <p className="text-[11px] font-black text-foreground">{insights.totalCount} bills</p>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/50 px-10">
           <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
             <Activity className="h-7 w-7 text-primary/40" />
           </div>
           <h3 className="text-lg font-bold text-foreground tracking-tight">Financial Summary</h3>
           <p className="text-sm text-muted-foreground mt-1 leading-relaxed px-4">Detailed member balances and debt summaries will appear once you finalize expense splits.</p>
        </div>
      )}

      {/* MEMBER AUDIT LOG DIALOG */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-[calc(100vw-32px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 [&>button]:hidden">
          <div className="h-24 bg-foreground relative flex flex-col items-center justify-center shrink-0">
             <div className="absolute top-4 right-4">
                <DialogClose className="h-8 w-8 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all flex items-center justify-center">
                  <X className="h-4 w-4" />
                </DialogClose>
             </div>
             <div className="flex items-center gap-4 px-6 w-full">
                <Avatar className="h-10 w-10 border-2 border-white/20 shadow-lg">
                  <AvatarFallback className={getAvatarFallbackClasses(selectedMember?.name || "")}>
                    {getInitials(selectedMember?.name || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-bold text-white truncate">{selectedMember?.name}</DialogTitle>
                  <DialogDescription className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Transaction Log</DialogDescription>
                </div>
             </div>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 sm:p-5">
              {memberHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-muted/20">
                      <TableHead className="text-[8px] font-black uppercase tracking-tighter h-8 text-muted-foreground px-1">Expense</TableHead>
                      <TableHead className="text-[8px] font-black uppercase tracking-tighter h-8 text-right text-muted-foreground px-1">Paid</TableHead>
                      <TableHead className="text-[8px] font-black uppercase tracking-tighter h-8 text-right text-muted-foreground px-1">Share</TableHead>
                      <TableHead className="text-[8px] font-black uppercase tracking-tighter h-8 text-right text-muted-foreground px-1">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberHistory.map((row) => (
                      <TableRow key={row.id} className="border-muted/10 hover:bg-muted/5">
                        <TableCell className="py-2 px-1">
                           <p className="text-[10px] font-bold text-foreground leading-tight line-clamp-1">{row.description}</p>
                           <p className="text-[7px] text-muted-foreground font-bold mt-0.5 uppercase tracking-tighter">By {row.payer.split(' ')[0]}</p>
                        </TableCell>
                        <TableCell className="text-right py-2 px-1 text-[9px] font-bold text-foreground/40">
                           {row.paid > 0 ? `₹${row.paid.toFixed(0)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right py-2 px-1 text-[9px] font-bold text-accent/60">
                           {row.share > 0 ? `-₹${row.share.toFixed(0)}` : '—'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right py-2 px-1 text-[10px] font-black",
                          row.net > 0.01 ? "text-primary" : row.net < -0.01 ? "text-accent" : "text-muted-foreground/20"
                        )}>
                          {row.net > 0.01 ? '+' : ''}{row.net.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 opacity-30">
                  <ReceiptText className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No history found</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-5 bg-muted/5 border-t shrink-0">
             <div className="grid grid-cols-3 gap-2 mb-4 px-1">
                <div className="text-left">
                  <p className="text-[7px] font-black text-muted-foreground/40 uppercase">Total Paid</p>
                  <p className="text-xs font-black text-foreground">₹{totals.paid.toFixed(0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[7px] font-black text-muted-foreground/40 uppercase">Total Share</p>
                  <p className="text-xs font-black text-accent">₹{totals.share.toFixed(0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-black text-muted-foreground/40 uppercase">Standing</p>
                  <p className={cn(
                    "text-xs font-black",
                    totals.net > 0.01 ? "text-primary" : totals.net < -0.01 ? "text-accent" : "text-muted-foreground"
                  )}>
                    {totals.net > 0.01 ? '+' : ''}₹{totals.net.toFixed(0)}
                  </p>
                </div>
             </div>
            <Button 
              className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => setSelectedMember(null)}
            >
              Close Ledger
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SETTLEMENT LOGIC DETAIL DIALOG */}
      <Dialog open={showSettlementDetail} onOpenChange={(open) => !open && setShowSettlementDetail(null)}>
        <DialogContent className="max-w-[calc(100vw-32px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 [&>button]:hidden">
          <div className="h-20 bg-foreground relative flex flex-col items-center justify-center shrink-0">
             <div className="absolute top-4 right-4">
                <DialogClose className="h-7 w-7 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </DialogClose>
             </div>
             <div className="flex flex-col items-center text-center">
                <DialogTitle className="text-base font-bold text-white leading-none">How it's calculated</DialogTitle>
                <DialogDescription className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Settlement Logic</DialogDescription>
             </div>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 sm:p-6 space-y-5">
              <div className="space-y-3">
                 <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">1. The Ledger</h4>
                 <p className="text-[10px] text-muted-foreground leading-relaxed">
                   We calculate the <span className="font-bold text-foreground">Net Standings</span> by subtracting total share from total paid for every member.
                 </p>
                 
                 <div className="grid grid-cols-1 gap-2 pt-1">
                    <div className="space-y-1.5">
                        <h4 className="text-[8px] font-black text-accent uppercase tracking-wider px-1">Debtors</h4>
                        <div className="grid gap-2">
                          {groupedStandings.filter(s => s.netTotal < -0.01).map(s => (
                            <div key={s.id} className="bg-accent/5 p-2.5 rounded-xl space-y-1 border border-accent/10">
                                <span className="text-[9px] font-bold truncate block text-foreground">{s.name}</span>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-[7px] text-muted-foreground font-medium uppercase tracking-tight">Paid ₹{s.totalPaid.toFixed(0)} • Share ₹{s.totalShare.toFixed(0)}</span>
                                  <span className="text-[9px] font-black text-accent">₹{Math.abs(s.netTotal).toFixed(0)}</span>
                                </div>
                            </div>
                          ))}
                        </div>
                    </div>
                    <div className="space-y-1.5 pt-2">
                        <h4 className="text-[8px] font-black text-primary uppercase tracking-wider px-1">Creditors</h4>
                        <div className="grid gap-2">
                          {groupedStandings.filter(s => s.netTotal > 0.01).map(s => (
                            <div key={s.id} className="bg-primary/5 p-2.5 rounded-xl space-y-1 border border-primary/10">
                                <span className="text-[9px] font-bold truncate block text-foreground">{s.name}</span>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-[7px] text-muted-foreground font-medium uppercase tracking-tight">Paid ₹{s.totalPaid.toFixed(0)} • Share ₹{s.totalShare.toFixed(0)}</span>
                                  <span className="text-[9px] font-black text-primary">₹{s.netTotal.toFixed(0)}</span>
                                </div>
                            </div>
                          ))}
                        </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-muted/20">
                 <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">2. Optimization</h4>
                 <div className="bg-muted/30 p-4 rounded-2xl border border-muted/50">
                    <div className="space-y-1">
                      <p className="text-[10px] text-foreground font-bold uppercase tracking-tight">Debt Simplification</p>
                      <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                        Instead of multiple back-and-forth payments between individuals, we pool everyone's activity. This settlement plan ensures all debts are resolved with the minimum number of transfers possible.
                      </p>
                    </div>
                 </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-muted/20">
                <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">3. Verification Audit</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                  Real data used to calculate the balances above:
                </p>
                <div className="space-y-2">
                  {auditExpenses.slice(0, 15).map((exp) => (
                    <div key={exp.id} className="p-3 bg-white border border-muted-foreground/10 rounded-[1.25rem] shadow-sm space-y-3 transition-all hover:border-primary/20 group">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-foreground leading-tight truncate block">{exp.description}</span>
                          <span className="text-[7px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1 block">
                            {new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {exp.splitType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-foreground block">₹{parseFloat(exp.amount).toFixed(0)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-muted/5">
                        <div className="flex items-center gap-2">
                           <div className="h-6 w-6 rounded-full border border-white shadow-sm shrink-0 overflow-hidden ring-1 ring-black/5">
                              <Avatar className="h-full w-full">
                                <AvatarImage src={participantsMap[exp.payerId]?.avatar} />
                                <AvatarFallback className={cn("text-[8px] font-bold", getAvatarFallbackClasses(exp.payerName))}>
                                  {getInitials(exp.payerName)}
                                </AvatarFallback>
                              </Avatar>
                           </div>
                           <div className="min-w-0">
                              <p className="text-[9px] font-bold text-foreground truncate">{exp.payerName.split(' ')[0]}</p>
                           </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                           <div className="flex -space-x-1.5 overflow-hidden">
                              {exp.selectedIndividuals?.slice(0, 3).map((id: string, i: number) => (
                                <Avatar key={i} className="h-5 w-5 border border-white shadow-sm shrink-0 ring-1 ring-black/5">
                                  <AvatarImage src={participantsMap[id]?.avatar} />
                                  <AvatarFallback className={cn("text-[7px] font-bold", getAvatarFallbackClasses(participantsMap[id]?.name || "?"))}>
                                    {getInitials(participantsMap[id]?.name || "?")}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditExpenses.length > 15 && (
                    <p className="text-[8px] text-center text-muted-foreground/40 font-bold uppercase py-2">
                      + {auditExpenses.length - 15} more transactions verified
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-5 bg-muted/5 border-t">
             <Button 
               className="w-full h-11 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
               onClick={() => setShowSettlementDetail(false)}
             >
               Got it
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
