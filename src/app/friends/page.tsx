"use client";

import { useState } from "react";
import { Search, MoreVertical, User, UserX, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Cleared mock data as requested
const FRIENDS: any[] = [];
const PENDING_REQUESTS: any[] = [];

export default function FriendsPage() {
  const [activeMenuName, setActiveMenuName] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-8 bg-white rounded-b-[2rem] shadow-sm">
        <h1 className="text-3xl font-bold text-foreground mb-6">Friends</h1>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Find friends by name or ID..." 
            className="h-14 pl-12 rounded-2xl bg-muted border-none shadow-sm focus-visible:ring-primary placeholder:text-muted-foreground/60"
          />
        </div>
      </header>

      <main className="px-safe-pad pt-8 space-y-8">
        {PENDING_REQUESTS.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Friend requests</h2>
            <div className="grid gap-3">
              {PENDING_REQUESTS.map((request) => (
                <Card key={request.name} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.avatar} />
                        <AvatarFallback>{request.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm">{request.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 rounded-lg px-3">Accept</Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-lg px-3 text-muted-foreground">Decline</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Your friends</h2>
          {FRIENDS.length > 0 ? (
            <div className="grid gap-3">
              {FRIENDS.map((friend) => {
                const isDimmed = activeMenuName !== null && activeMenuName !== friend.name;
                
                return (
                  <Card 
                    key={friend.name} 
                    className={cn(
                      "border-none shadow-sm bg-white rounded-2xl overflow-hidden transition-all duration-300",
                      isDimmed && "opacity-30 grayscale-[0.5] scale-[0.98] blur-[0.5px]"
                    )}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-base">{friend.name}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "h-2 w-2 rounded-full",
                              friend.status === 'Active' ? 'bg-green-500' : 'bg-muted-foreground'
                            )} />
                            {friend.status}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu onOpenChange={(open) => setActiveMenuName(open ? friend.name : null)}>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-primary/10 rounded-xl">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px] p-2">
                          <DropdownMenuItem className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5 focus:bg-primary/10">
                            <User className="h-4 w-4" />
                            <span className="font-medium">View profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5 text-destructive focus:bg-destructive focus:text-destructive-foreground">
                            <UserX className="h-4 w-4" />
                            <span className="font-medium">Remove friend</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-muted/50">
               <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <UserPlus className="h-7 w-7 text-muted-foreground/40" />
               </div>
               <p className="text-lg font-bold text-foreground">No friends yet</p>
               <p className="text-sm text-muted-foreground mt-1 mb-6 px-10 leading-relaxed">Connect with your travel buddies to start splitting expenses.</p>
               <Button variant="outline" className="rounded-2xl px-8 h-12 font-bold border-primary text-primary hover:bg-primary/5">
                 Invite a friend
               </Button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
