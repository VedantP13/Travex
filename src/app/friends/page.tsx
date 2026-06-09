"use client";

import { UserPlus, Search, MoreVertical, User, UserX } from "lucide-react";
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

const FRIENDS = [
  { name: "Sonia", status: "Active", avatar: "https://picsum.photos/seed/user2/100/100" },
  { name: "Leo", status: "Active", avatar: "https://picsum.photos/seed/user3/100/100" },
  { name: "Julie", status: "Offline", avatar: "https://picsum.photos/seed/user4/100/100" },
];

export default function FriendsPage() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-8 bg-white rounded-b-[2rem] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Friends</h1>
          <Button size="icon" variant="outline" className="rounded-full h-12 w-12 border-primary/20 bg-primary/5 text-primary">
            <UserPlus className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Find friends by name or ID..." 
            className="h-14 pl-12 rounded-2xl bg-muted border-none shadow-sm focus-visible:ring-primary placeholder:text-muted-foreground/60"
          />
        </div>
      </header>

      <main className="px-safe-pad pt-8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Friend Requests</h2>
          <p className="text-sm text-muted-foreground italic text-center py-4 bg-white/40 rounded-2xl border border-dashed border-muted">
            No pending requests
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Your Friends</h2>
          <div className="grid gap-3">
            {FRIENDS.map((friend) => (
              <Card key={friend.name} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-base">{friend.name}</h3>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className={`h-2 w-2 rounded-full ${friend.status === 'Active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        {friend.status}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-primary/10 rounded-xl">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px] p-2">
                      <DropdownMenuItem className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5">
                        <User className="h-4 w-4" />
                        <span className="font-medium">View Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5 text-destructive focus:text-destructive">
                        <UserX className="h-4 w-4" />
                        <span className="font-medium">Remove Friend</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
