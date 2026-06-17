'use client';

import { Utensils, Car, Home, ShoppingBag, Plane, Camera, Box, Timer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TripFeedProps {
  unsplitExpenses: any[];
  finalizedExpenses: any[];
  loading: boolean;
  onSelectExpense: (expense: any) => void;
  onSplitNow: (expenseId: string) => void;
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

export function TripFeed({ unsplitExpenses, finalizedExpenses, loading, onSelectExpense, onSplitNow }: TripFeedProps) {
  return (
    <div className="space-y-4 pb-24">
      {unsplitExpenses.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 px-1">
            <Timer className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-semibold text-accent tracking-widest uppercase">Pending tasks</h2>
          </div>
          {unsplitExpenses.map(item => {
            const Icon = getCategoryIcon(item.category);
            return (
              <Card key={item.id} className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onSelectExpense(item)}>
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-none mb-1">₹{parseFloat(item.amount || 0).toFixed(2)}</h3>
                      <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[140px]">
                        {item.description} • {item.date}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="rounded-full bg-accent text-accent-foreground font-bold text-xs h-9 px-4 hover:scale-105 transition-all shadow-md shadow-accent/20"
                    onClick={() => onSplitNow(item.id)}
                  >
                    Split Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          <div className="h-px bg-muted/30 mx-2 my-4" />
        </div>
      )}

      {finalizedExpenses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-foreground/60 tracking-widest px-1 uppercase">Expenses</h2>
          {finalizedExpenses.map(item => {
            const Icon = getCategoryIcon(item.category);
            return (
              <div 
                key={item.id} 
                className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center gap-5 group hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                onClick={() => onSelectExpense(item)}
              >
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", getCategoryColor(item.category))}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate text-foreground">{item.description}</h3>
                  <p className="text-[10px] font-medium text-muted-foreground">Paid by {item.payerName?.split(' ')[0]} • {item.date}</p>
                </div>
                <p className="font-bold text-base tracking-tight text-foreground">₹{parseFloat(item.amount || 0).toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      )}

      {!loading && unsplitExpenses.length === 0 && finalizedExpenses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 px-8">
          <div className="h-14 w-14 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-bold text-foreground">No expenses yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Tap the + button to add your first transaction.</p>
        </div>
      )}
    </div>
  );
}
