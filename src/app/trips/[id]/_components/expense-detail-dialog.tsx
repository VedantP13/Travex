
'use client';

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  Trash2, 
  Pencil, 
  User, 
  Calendar as CalendarIcon, 
  Tag, 
  Calculator, 
  CreditCard, 
  MoreHorizontal,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Plane,
  Camera,
  Box,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface ExpenseDetailDialogProps {
  expense: any;
  trip: any;
  onClose: () => void;
  onDelete: (expenseId: string) => void;
  onFinalizeSplit: (expenseId: string) => void;
}

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'Food': return Utensils;
    case 'Transport': return Car;
    case 'Stay': return Home;
    case 'Shopping': return ShoppingBag;
    case 'Flights': return Plane;
    case 'Sightseeing': return Camera;
    default: return Box;
  }
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case 'Food': return 'bg-orange-100 text-orange-600';
    case 'Transport': return 'bg-blue-100 text-blue-600';
    case 'Stay': return 'bg-purple-100 text-purple-600';
    case 'Shopping': return 'bg-pink-100 text-pink-600';
    case 'Flights': return 'bg-indigo-100 text-indigo-600';
    case 'Sightseeing': return 'bg-green-100 text-green-600';
    default: return 'bg-teal-100 text-teal-600';
  }
};

const getSplitTypeLabel = (type: string) => {
  switch (type) {
    case 'equal_person': return 'Per person';
    case 'equal_family': return 'Per family';
    case 'custom': return 'Custom';
    case 'just_me': return 'Just me';
    case 'unsplit': return 'Unsplit';
    default: return type?.replace('_', ' ') || 'Standard';
  }
};

export function ExpenseDetailDialog({ expense, trip, onClose, onDelete, onFinalizeSplit }: ExpenseDetailDialogProps) {
  const router = useRouter();

  const splits = useMemo(() => {
    if (!expense || !trip?.participants) return [];
    
    const amount = parseFloat(expense.amount);
    const participantsMap = new Map();
    trip.participants.forEach((p: any) => participantsMap.set(p.id, p));

    const selected = expense.selectedIndividuals || [];
    if (expense.splitType === 'unsplit') return [];

    const familyGroups: Record<string, any> = {};

    selected.forEach((id: string) => {
      const isFamilyMember = id.includes('-');
      const parentId = isFamilyMember ? id.split('-')[0] : id;
      const memberName = isFamilyMember ? id.split('-')[1] : null;

      if (!familyGroups[parentId]) {
        const p = participantsMap.get(parentId);
        if (p) {
          familyGroups[parentId] = {
            id: parentId,
            name: p.name,
            avatar: p.avatar,
            members: [],
            totalShare: 0
          };
        }
      }

      if (familyGroups[parentId]) {
        if (isFamilyMember) {
          familyGroups[parentId].members.push({ id, name: memberName, share: 0 });
        } else {
          familyGroups[parentId].members.unshift({ id, name: participantsMap.get(parentId).name, share: 0 });
        }
      }
    });

    if (expense.splitType === 'equal_person') {
      const sharePerPerson = amount / selected.length;
      Object.values(familyGroups).forEach((group: any) => {
        group.members.forEach((m: any) => {
          m.share = sharePerPerson;
          group.totalShare += sharePerPerson;
        });
      });
    } else if (expense.splitType === 'equal_family') {
      const numFamilies = Object.keys(familyGroups).length;
      const sharePerFamily = amount / numFamilies;
      Object.values(familyGroups).forEach((group: any) => {
        group.totalShare = sharePerFamily;
        const sharePerMember = sharePerFamily / group.members.length;
        group.members.forEach((m: any) => m.share = sharePerMember);
      });
    } else if (expense.splitType === 'custom') {
      const customAmounts = expense.customAmounts || {};
      Object.values(familyGroups).forEach((group: any) => {
        group.members.forEach((m: any) => {
          const val = parseFloat(customAmounts[m.id] || "0");
          m.share = val;
          group.totalShare += val;
        });
      });
    } else if (expense.splitType === 'just_me') {
       const payerId = expense.payerId;
       const p = participantsMap.get(payerId);
       if (p) {
         return [{
           id: payerId,
           name: p.name,
           avatar: p.avatar,
           totalShare: amount,
           members: [{ id: payerId, name: p.name, share: amount }]
         }];
       }
    }

    return Object.values(familyGroups).sort((a: any, b: any) => b.totalShare - a.totalShare);
  }, [expense, trip?.participants]);

  const friendlyDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMMM yyyy");
    } catch {
      return dateStr;
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Expense details</DialogTitle>
          <DialogDescription>View the full breakdown and split for this trip expense.</DialogDescription>
        </DialogHeader>
        
        <div className={cn(
          "h-48 relative flex flex-col items-center justify-center overflow-hidden pt-6",
          getCategoryColor(expense.category)
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute left-6 top-6 h-9 w-9 rounded-full bg-black/5 text-foreground/40 hover:bg-black/10 transition-all border border-black/5 z-20">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-2xl p-1 border-none shadow-xl bg-white min-w-[140px]">
              <DropdownMenuItem className="rounded-xl py-2 px-3 font-semibold text-xs flex items-center gap-2" disabled>
                <Pencil className="h-3.5 w-3.5" /> Edit expense
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="rounded-xl py-2 px-3 font-semibold text-xs text-destructive focus:bg-destructive/5 flex items-center gap-2"
                onClick={() => onDelete(expense.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-6 top-6 h-9 w-9 rounded-full flex items-center justify-center bg-black/5 text-foreground/40 hover:bg-black/10 transition-all z-20 border border-black/5">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
          
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <div className="h-12 w-12 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center mb-3 shadow-sm border border-white/20">
              {(() => {
                const Icon = getCategoryIcon(expense.category);
                return <Icon className="h-6 w-6" />;
              })()}
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground leading-none">₹{parseFloat(expense.amount).toFixed(2)}</h2>
            <p className="text-sm font-bold text-foreground/60 mt-2 max-w-[240px] leading-tight">
              {expense.description}
            </p>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] relative">
          <div className="px-6 py-8 space-y-8">
            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground/50 flex items-center gap-1.5">
                  <User className="h-2.5 w-2.5" /> Paid by
                </Label>
                <p className="text-xs font-bold text-foreground">{expense.payerName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground/50 flex items-center gap-1.5">
                  <CalendarIcon className="h-2.5 w-2.5" /> Date
                </Label>
                <p className="text-xs font-bold text-foreground">{friendlyDate(expense.date)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground/50 flex items-center gap-1.5">
                  <Tag className="h-2.5 w-2.5" /> Category
                </Label>
                <p className="text-xs font-bold text-foreground">{expense.category}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground/50 flex items-center gap-1.5">
                  <Calculator className="h-2.5 w-2.5" /> Split type
                </Label>
                <p className="text-xs font-bold text-foreground">{getSplitTypeLabel(expense.splitType)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground/50 flex items-center gap-1.5">
                  <CreditCard className="h-2.5 w-2.5" /> Method
                </Label>
                <p className="text-xs font-bold text-foreground">{expense.paymentType || 'Other'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-muted/20 pb-3">
                <Label className="text-[10px] font-bold text-muted-foreground/50">Split breakdown</Label>
              </div>

              <div className="space-y-3 pb-4">
                {expense.splitType === 'unsplit' ? (
                  <div className="py-8 bg-accent/5 rounded-3xl border-2 border-dashed border-accent/10 flex flex-col items-center justify-center text-center px-6">
                     <Timer className="h-7 w-7 text-accent/60 mb-2" />
                     <p className="text-xs font-bold text-foreground">Draft expense</p>
                     <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">This hasn't been split yet.</p>
                     <Button 
                       size="sm" 
                       className="mt-4 rounded-xl bg-accent text-accent-foreground font-bold h-8 text-[10px] px-5"
                       onClick={() => onFinalizeSplit(expense.id)}
                     >
                       Finalize split
                     </Button>
                  </div>
                ) : (
                  splits.map((group: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-black/5">
                            <AvatarImage src={group.avatar} className="object-cover" />
                            <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">{group.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-bold text-foreground/80">
                              {group.members.length > 1 ? `${group.name.split(' ')[0]}'s family` : group.name}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-black text-foreground">₹{group.totalShare.toFixed(2)}</p>
                      </div>
                      
                      {group.members.length > 1 && (
                        <div className="ml-12 space-y-1.5 border-l-2 border-muted/20 pl-3">
                          {group.members.map((m: any, mIdx: number) => (
                            <div key={mIdx} className="flex justify-between items-center">
                              <span className="text-[10px] font-medium text-muted-foreground/70">{m.name}</span>
                              <span className="text-[10px] font-bold text-muted-foreground/50">₹{m.share.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </ScrollArea>

        <div className="p-6 bg-muted/5 border-t">
          <Button 
            className="w-full h-14 rounded-2xl bg-primary text-white font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
            onClick={onClose}
          >
            Close details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
