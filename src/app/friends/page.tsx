
"use client";

import { useState, useEffect } from "react";
import { Search, MoreVertical, User, UserX, UserPlus, Check, X, Loader2, Mail, Users as UsersIcon } from "lucide-react";
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
import { useUser, useFirestore } from "@/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function FriendsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeMenuName, setActiveMenuName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for friends
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    const q = query(collection(firestore, "users", user.uid, "friends"), where("status", "==", "accepted"));
    const unsub = onSnapshot(q, (snap) => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  // Listen for incoming requests
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    const q = query(collection(firestore, "users", user.uid, "requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  // Search users with mutual friend prioritization and guest exclusion
  useEffect(() => {
    const searchUsers = async () => {
      const qry = searchQuery.trim();
      if (qry.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        let snap;
        if (qry.includes('@')) {
          const emailQ = query(
            collection(firestore, "users"),
            where("email", "==", qry.toLowerCase()),
            limit(5)
          );
          snap = await getDocs(emailQ);
        } else {
          const nameQ = query(
            collection(firestore, "users"),
            where("displayName", ">=", qry),
            where("displayName", "<=", qry + "\uf8ff"),
            limit(10)
          );
          snap = await getDocs(nameQ);
        }

        const initialResults = snap.docs
          .map(d => ({ id: d.id, ...d.data(), mutualCount: 0 }))
          .filter(u => u.id !== user?.uid && u.isAnonymous !== true && !!u.email);
        
        if (friends.length > 0) {
          const resultsWithMutuals = await Promise.all(initialResults.map(async (resUser) => {
            let mutualCount = 0;
            const checks = friends.slice(0, 5).map(async (friend) => {
              const mutualDoc = await getDoc(doc(firestore, "users", friend.friendId, "friends", resUser.id));
              if (mutualDoc.exists() && mutualDoc.data()?.status === 'accepted') {
                return true;
              }
              return false;
            });

            const checkResults = await Promise.all(checks);
            mutualCount = checkResults.filter(Boolean).length;
            
            return { ...resUser, mutualCount };
          }));

          resultsWithMutuals.sort((a, b) => b.mutualCount - a.mutualCount);
          setSearchResults(resultsWithMutuals);
        } else {
          setSearchResults(initialResults);
        }

      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, firestore, user?.uid, friends]);

  const handleSendRequest = async (targetUser: any) => {
    if (!user?.uid || !firestore) return;
    
    const requestData = {
      senderId: user.uid,
      senderName: user.displayName || "Explorer",
      senderPhoto: user.photoURL || "",
      createdAt: serverTimestamp()
    };

    const friendEntry = {
      friendId: targetUser.id,
      friendName: targetUser.displayName,
      friendPhoto: targetUser.photoURL || "",
      status: "pending",
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(firestore, "users", targetUser.id, "requests", user.uid), requestData);
      await setDoc(doc(firestore, "users", user.uid, "friends", targetUser.id), friendEntry);
      
      toast({ title: "Request sent", description: `Friend request sent to ${targetUser.displayName}` });
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `/users/${targetUser.id}/requests/${user.uid}`,
        operation: 'create',
        requestResourceData: requestData
      }));
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!user?.uid || !firestore) return;

    try {
      const myFriendDoc = {
        friendId: request.senderId,
        friendName: request.senderName,
        friendPhoto: request.senderPhoto || "",
        status: "accepted",
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(firestore, "users", user.uid, "friends", request.senderId), myFriendDoc);
      await setDoc(doc(firestore, "users", request.senderId, "friends", user.uid), {
        friendId: user.uid,
        friendName: user.displayName || "Explorer",
        friendPhoto: user.photoURL || "",
        status: "accepted",
        updatedAt: serverTimestamp()
      });
      await deleteDoc(doc(firestore, "users", user.uid, "requests", request.senderId));

      toast({ title: "Friends connected!", description: `You are now friends with ${request.senderName}` });
    } catch (error: any) {
       console.error(error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.uid || !firestore) return;
    try {
      await deleteDoc(doc(firestore, "users", user.uid, "friends", friendId));
      await deleteDoc(doc(firestore, "friendId", "friends", user.uid));
      toast({ title: "Friend removed" });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-6 bg-white rounded-b-[2rem] shadow-sm">
        <h1 className="text-3xl font-bold text-foreground mb-6">Friends</h1>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="h-14 pl-12 rounded-2xl bg-muted border-none shadow-sm focus-visible:ring-primary placeholder:text-muted-foreground/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <Card className="mt-4 border-none shadow-xl bg-white rounded-2xl overflow-hidden divide-y animate-in fade-in slide-in-from-top-2 duration-300">
            {searchResults.map(result => {
              const isAlreadyFriend = friends.some(f => f.friendId === result.id);
              return (
                <div key={result.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarImage src={result.photoURL} />
                      <AvatarFallback>{result.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{result.displayName}</p>
                        {result.mutualCount > 0 && (
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            <UsersIcon className="h-2 w-2" />
                            <span className="text-[8px] font-bold uppercase tracking-tighter">{result.mutualCount} mutual</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                        <Mail className="h-2 w-2" />
                        {result.email}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className={cn(
                      "rounded-full h-8 px-4 font-bold text-xs",
                      isAlreadyFriend ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-primary text-white"
                    )} 
                    onClick={() => handleSendRequest(result)}
                    disabled={isAlreadyFriend}
                  >
                    {isAlreadyFriend ? "Friends" : "Add Friend"}
                  </Button>
                </div>
              );
            })}
          </Card>
        )}
      </header>

      <main className="px-safe-pad pt-6 space-y-8">
        {requests.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Friend requests</h2>
            <div className="grid gap-3">
              {requests.map((request) => (
                <Card key={request.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.senderPhoto} />
                        <AvatarFallback>{request.senderName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm">{request.senderName}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 rounded-lg px-3 bg-primary" onClick={() => handleAcceptRequest(request)}>Accept</Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 rounded-lg px-3 text-muted-foreground"
                        onClick={() => deleteDoc(doc(firestore, "users", user!.uid, "requests", request.senderId))}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Your friends</h2>
          {friends.length > 0 ? (
            <div className="grid gap-3">
              {friends.map((friend) => {
                const isDimmed = activeMenuName !== null && activeMenuName !== friend.friendName;
                
                return (
                  <Card 
                    key={friend.id} 
                    className={cn(
                      "border-none shadow-sm bg-white rounded-2xl overflow-hidden transition-all duration-300",
                      isDimmed && "opacity-30 grayscale-[0.5] scale-[0.98] blur-[0.5px]"
                    )}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarImage src={friend.friendPhoto} />
                          <AvatarFallback>{friend.friendName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-base">{friend.friendName}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Connected
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu onOpenChange={(open) => setActiveMenuName(open ? friend.friendName : null)}>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-primary/10 rounded-xl">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px] p-2">
                          <DropdownMenuItem className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5 focus:bg-primary/10">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-xs">View profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5 text-destructive focus:bg-destructive focus:text-destructive-foreground"
                            onClick={() => handleRemoveFriend(friend.friendId)}
                          >
                            <UserX className="h-4 w-4" />
                            <span className="font-medium text-xs">Remove friend</span>
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
               <Button 
                variant="outline" 
                className="rounded-2xl px-8 h-12 font-bold border-primary text-primary hover:bg-primary/5"
                onClick={() => document.querySelector('input')?.focus()}
              >
                 Find a friend
               </Button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
