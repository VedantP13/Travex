'use client';

import { useMemo, useState } from "react";
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
  Timer,
  AlertTriangle,
  Loader2,
  Construction
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    case 'Food': return 'bg-orange-50 text-orange-600';
    case 'Transport': return 'bg-blue-50 text-blue-600';
    case 'Stay': return 'bg-purple-50 text-purple-600';
    case 'Shopping': return 'bg-pink-50 text-pink-600';
    case 'Flights': return 'bg-indigo-50 text-indigo-600';
    case 'Sightseeing': return 'bg-green-50 text-green-600';
    default: return 'bg-teal-50 text-teal-600';
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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditPlaceholderOpen, setIsEditPlaceholderOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(expense.id);
    setIsDeleting(false);
    setIsDeleteConfirmOpen(false);
  };

  if (!expense) return null;

  return (
    <>
      <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Expense details</DialogTitle>
            <DialogDescription>View the full breakdown and split for this trip expense.</DialogDescription>
          </DialogHeader>
          
          <div className={cn(
            "h-44 relative flex flex-col items-center justify-center overflow-hidden pt-8 shrink-0",
            getCategoryColor(expense.category)
          )}>
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/40 backdrop-blur-md text-foreground/60 hover:bg-white/60 transition-all border border-white/20">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-2xl min-w-[160px] p-1 shadow-xl border-none bg-white">
                  <DropdownMenuItem 
                    className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-primary focus:bg-primary/10 focus:text-primary active:scale-[0.98] transition-all" 
                    onClick={() => setIsEditPlaceholderOpen(true)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 group-focus:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-xs">Edit expense</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive active:scale-[0.98] transition-all"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                  >
                    <div className="h-8 w-8 rounded-full bg-destructive/10 group-focus:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-xs">Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md text-foreground/60 hover:bg-white/60 transition-all border border-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center px-6 mt-4">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-md border border-white/20">
                {(() => {
                  const Icon = getCategoryIcon(expense.category);
                  return <Icon className="h-6 w-6" />;
                })()}
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground leading-none">₹{parseFloat(expense.amount).toFixed(2)}</h2>
              <p className="text-xs font-medium text-foreground/50 mt-1.5 max-w-[280px] leading-tight line-clamp-1">
                {expense.description}
              </p>
            </div>
          </div>

          <ScrollArea className="max-h-[50vh] relative">
            <div className="px-6 py-8 space-y-8">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Payer
                  </Label>
                  <p className="text-sm font-semibold text-foreground">{expense.payerName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                    <CalendarIcon className="h-3 w-3" /> Date
                  </Label>
                  <p className="text-sm font-semibold text-foreground">{friendlyDate(expense.date)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Category
                  </Label>
                  <p className="text-sm font-semibold text-foreground">{expense.category}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                    <Calculator className="h-3 w-3" /> Split type
                  </Label>
                  <p className="text-sm font-semibold text-foreground">{getSplitTypeLabel(expense.splitType)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3" /> Method
                  </Label>
                  <p className="text-sm font-semibold text-foreground">{expense.paymentType || 'Other'}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="border-b border-muted/10 pb-2">
                  <Label className="text-[10px] font-bold text-muted-foreground/80 tracking-wider">Split breakdown</Label>
                </div>

                <div className="space-y-5 pb-6">
                  {expense.splitType === 'unsplit' ? (
                    <div className="py-10 bg-accent/5 rounded-[2rem] border-2 border-dashed border-accent/10 flex flex-col items-center justify-center text-center px-8">
                       <Timer className="h-8 w-8 text-accent/40 mb-3" />
                       <h4 className="text-sm font-bold text-foreground">Draft expense</h4>
                       <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">This transaction hasn't been split yet.</p>
                       <Button 
                         size="sm" 
                         className="mt-5 rounded-xl bg-accent text-accent-foreground font-bold h-9 text-[11px] px-6 shadow-lg shadow-accent/10"
                         onClick={() => onFinalizeSplit(expense.id)}
                       >
                         Finalize split
                       </Button>
                    </div>
                  ) : (
                    splits.map((group: any, idx: number) => {
                      const isMe = group.name.includes("You") || group.name === "You" || (group.isUser && group.userId === trip.createdBy);
                      const familyDisplayName = isMe ? "Your family" : `${group.name.split(' ')[0]}'s family`;
                      
                      return (
                        <div key={idx} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-black/5">
                                <AvatarImage src={group.avatar} className="object-cover" />
                                <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">{group.name[0]}</AvatarFallback>
                              </Avatar>
                              <p className="text-sm font-semibold text-foreground">
                                {group.members.length > 1 ? familyDisplayName : group.name}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-foreground tracking-tight">₹{group.totalShare.toFixed(2)}</p>
                          </div>
                          
                          {group.members.length > 1 && (
                            <div className="ml-12 space-y-2 border-l-2 border-muted/10 pl-4 py-0.5">
                              {group.members.map((m: any, mIdx: number) => (
                                <div key={mIdx} className="flex justify-between items-center text-xs">
                                  <span className="font-medium text-muted-foreground/80">{m.name}</span>
                                  <span className="font-semibold text-muted-foreground/60">₹{m.share.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </ScrollArea>

          <div className="p-6 bg-muted/5 border-t shrink-0">
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={onClose}
            >
              Close details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-40 bg-destructive/10 relative flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
               <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
            </div>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Delete expense?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
                This transaction will be removed and trip balances will be recalculated. This cannot be undone.
              </AlertDialogDescription>
            </div>
            <div className="space-y-3 pt-2">
              <Button 
                variant="destructive"
                className="w-full h-14 rounded-2xl font-bold text-base gap-3 shadow-lg shadow-destructive/20 transition-all active:scale-95"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Permanently
              </Button>
              <AlertDialogCancel asChild>
                <Button 
                  variant="ghost"
                  className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isEditPlaceholderOpen} onOpenChange={setIsEditPlaceholderOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="h-44 bg-primary/5 relative flex flex-col items-center justify-center">
             <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Construction className="h-10 w-10 text-primary animate-pulse" />
             </div>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                Coming Soon!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
                We're currently building the <span className="text-primary font-bold">Edit Expense</span> engine to ensure your balance history stays perfectly accurate. 
                Stay tuned for updates!
              </AlertDialogDescription>
            </div>
            <div className="pt-2">
              <AlertDialogAction asChild>
                <Button 
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20"
                >
                  Got it
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
