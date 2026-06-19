
'use client';

import { useState, useMemo } from "react";
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowRight, 
  TrendingUp as TrendingUpIcon, 
  Activity, 
  Info,
  Crown,
  Tag,
  RefreshCw,
  Users,
  Search,
  ChevronRight,
  ReceiptText,
  Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const insights = useMemo(() => {
    if (!expenses.length) return null;

    // Top Payer
    const payerTotals: Record<string, { amount: number, name: string }> = {};
    expenses.forEach(e => {
      if (e.splitType === 'unsplit') return;
      payerTotals[e.payerId] = {
        amount: (payerTotals[e.payerId]?.amount || 0) + (parseFloat(e.amount) || 0),
        name: e.payerName
      };
    });
    const topPayer = Object.values(payerTotals).sort((a, b) => b.amount - a.amount)[0];

    // Top Category
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
          shareAmt = amount / selected.length;
        } else if (exp.splitType === 'equal_family') {
          const families = new Set(selected.map((sid: string) => sid.split('-')[0]));
          const sharePerFamily = amount / families.size;
          const membersInThisFamily = selected.filter((sid: string) => sid.startsWith(mid.split('-')[0]));
          shareAmt = sharePerFamily / membersInThisFamily.length;
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

  return (
    <div className="mt-6 space-y-6 pb-24">
      {groupedStandings.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-primary/5">
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <TrendingDown className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Total Owed</span>
              </div>
              <p className="text-lg font-bold">₹{groupedStandings.reduce((acc, s) => s.netTotal > 0 ? acc + s.netTotal : acc, 0).toFixed(0)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-destructive/5">
              <div className="flex items-center gap-1.5 text-destructive mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Total Debt</span>
              </div>
              <p className="text-lg font-bold">₹{Math.abs(groupedStandings.reduce((acc, s) => s.netTotal < -0.01 ? acc + s.netTotal : acc, 0)).toFixed(0)}</p>
            </div>
          </div>

          {suggestedPayments.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h2 className="text-xs font-semibold text-accent tracking-widest px-1 uppercase">Settlement Guide</h2>
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
                    Transfer these amounts to efficiently reach zero balances for everyone.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <h2 className="text-xs font-semibold text-foreground/60 tracking-widest px-1 uppercase mb-2">Net Standings</h2>
          <div className="grid gap-4">
            {groupedStandings.map((standing) => {
              const isPositive = standing.netTotal > 0.01;
              const isNegative = standing.netTotal < -0.01;
              const isZero = !isPositive && !isNegative;
              
              const displayName = standing.isMe 
                ? (standing.isSolo ? "You" : "Your family") 
                : (standing.isSolo ? standing.name : `${standing.name}'s family`);

              return (
                <Card key={standing.id} className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden group hover:shadow-md transition-shadow border border-muted/20">
                  <CardContent className="p-0">
                    <div className="p-5 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-white shadow-md shrink-0">
                          <AvatarImage src={standing.avatar} className="object-cover" />
                          <AvatarFallback className={getAvatarFallbackClasses(standing.name)}>
                            {getInitials(standing.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base truncate text-foreground">{displayName}</h3>
                          <p className={cn(
                            "text-[10px] font-extrabold uppercase tracking-widest mt-0.5 flex items-center gap-1",
                            isPositive ? "text-primary" : isNegative ? "text-accent" : "text-muted-foreground"
                          )}>
                            {isPositive ? <TrendingDown className="h-3 w-3" /> : isNegative ? <TrendingUpIcon className="h-3 w-3" /> : null}
                            {isPositive ? 'Owed to you' : isNegative ? 'Your debt' : 'Perfectly settled'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-lg font-black tracking-tight",
                          isPositive ? "text-primary" : isZero ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {isZero ? '—' : `₹${Math.abs(standing.netTotal).toFixed(0)}`}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-4 bg-muted/10 border-t border-muted/20 space-y-5">
                      <div className="flex justify-between items-center gap-2">
                        <div className="text-center flex-1">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5 tracking-tighter">Total Paid</p>
                          <p className="text-sm font-black text-foreground">₹{standing.totalPaid.toFixed(0)}</p>
                        </div>
                        <div className="h-8 w-px bg-muted/40" />
                        <div className="text-center flex-1">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5 tracking-tighter">Total Share</p>
                          <p className="text-sm font-black text-foreground">₹{standing.totalShare.toFixed(0)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Users className="h-3 w-3 text-muted-foreground/40" />
                          <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Member Ledger</p>
                        </div>
                        
                        <div className="space-y-1">
                          {standing.breakdown.map((b: any, idx: number) => {
                            const bPos = b.balance > 0.01;
                            const bNeg = b.balance < -0.01;
                            return (
                              <div 
                                key={idx} 
                                className="flex justify-between items-center text-xs p-3 rounded-2xl bg-white/50 border border-muted/10 active:scale-[0.98] transition-all cursor-pointer group hover:border-primary/20"
                                onClick={() => setSelectedMember({ id: b.id, name: b.name })}
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-foreground block truncate group-hover:text-primary transition-colors">{b.name}</span>
                                  <p className="text-[9px] text-muted-foreground/60 font-medium">
                                    Paid ₹{b.paid.toFixed(0)} • Share ₹{b.share.toFixed(0)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className={cn(
                                      "font-black text-[11px]",
                                      bPos ? "text-primary" : bNeg ? "text-accent" : "text-muted-foreground/30"
                                    )}>
                                      {bPos ? '+' : bNeg ? '-' : ''}₹{Math.abs(b.balance).toFixed(0)}
                                    </span>
                                  </div>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
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
                Calculations are based on <strong>Total Paid</strong> (physical spend) minus <strong>Total Share</strong> (cost split). This matches the standard finance tracking in your trip exports.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/50 px-10">
           <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
             <Activity className="h-7 w-7 text-primary/40" />
           </div>
           <h3 className="text-lg font-bold text-foreground tracking-tight">Ledger Summaries</h3>
           <p className="text-sm text-muted-foreground mt-1 leading-relaxed px-4">Financial standings and individual member shares will appear once you finalize expense splits.</p>
        </div>
      )}

      {/* MEMBER AUDIT LOG DIALOG */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-[calc(100vw-32px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 [&>button]:hidden">
          <div className="h-28 bg-foreground relative flex flex-col items-center justify-center shrink-0">
             <div className="absolute top-4 right-4">
                <DialogClose className="h-8 w-8 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all flex items-center justify-center">
                  <X className="h-4 w-4" />
                </DialogClose>
             </div>
             <div className="flex items-center gap-4 px-8 w-full">
                <Avatar className="h-12 w-12 border-2 border-white/20 shadow-lg">
                  <AvatarFallback className={getAvatarFallbackClasses(selectedMember?.name || "")}>
                    {getInitials(selectedMember?.name || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-bold text-white truncate">{selectedMember?.name}</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Expense Audit Log</DialogDescription>
                </div>
             </div>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 sm:p-6">
              {memberHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-muted/20">
                      <TableHead className="text-[9px] font-black uppercase tracking-tighter h-8 text-muted-foreground">Expense</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-tighter h-8 text-right text-muted-foreground">Paid</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-tighter h-8 text-right text-muted-foreground">Share</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-tighter h-8 text-right text-muted-foreground">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberHistory.map((row) => (
                      <TableRow key={row.id} className="border-muted/10 hover:bg-muted/5">
                        <TableCell className="py-3 px-2">
                           <p className="text-[11px] font-bold text-foreground leading-tight line-clamp-1">{row.description}</p>
                           <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Payer: {row.payer.split(' ')[0]}</p>
                        </TableCell>
                        <TableCell className="text-right py-3 px-2 text-[10px] font-medium text-foreground/60">
                           {row.paid > 0 ? `₹${row.paid.toFixed(0)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right py-3 px-2 text-[10px] font-medium text-accent">
                           {row.share > 0 ? `-₹${row.share.toFixed(0)}` : '—'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right py-3 px-2 text-[11px] font-black",
                          row.net > 0.01 ? "text-primary" : row.net < -0.01 ? "text-accent" : "text-muted-foreground/30"
                        )}>
                          {row.net > 0.01 ? '+' : ''}{row.net.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 opacity-30">
                  <ReceiptText className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No transaction history</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-muted/5 border-t shrink-0">
             <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-2">
                   <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                   <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Calculated totals</span>
                </div>
                <div className="flex gap-4">
                   <div className="text-right">
                      <p className="text-[8px] font-black text-muted-foreground/40 uppercase">Paid</p>
                      <p className="text-xs font-bold text-foreground">₹{memberHistory.reduce((acc, h) => acc + h.paid, 0).toFixed(0)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-muted-foreground/40 uppercase">Share</p>
                      <p className="text-xs font-bold text-accent">₹{memberHistory.reduce((acc, h) => acc + h.share, 0).toFixed(0)}</p>
                   </div>
                </div>
             </div>
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => setSelectedMember(null)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
