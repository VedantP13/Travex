
"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, MoreVertical, User, UserX, UserPlus, Loader2, Mail, Users as UsersIcon, ArrowRight, Check, X as XIcon, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useTrips } from "@/context/trips-context";
import { useRouter } from "next/navigation";

export default function FriendsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { trips } = useTrips();
  const { toast } = useToast();
  const [activeMenuName, setActiveMenuName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate Companion IDs (users shared a trip with) for prioritization
  const companionIds = useMemo(() => {
    const ids = new Set<string>();
    trips.forEach(trip => {
      trip.participantIds?.forEach((id: string) => {
        if (id !== user?.uid) ids.add(id);
      });
    });
    return ids;
  }, [trips, user?.uid]);

  // Listen for all friendships (pending and accepted)
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    const q = query(collection(firestore, "users", user.uid, "friends"));
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

  const handleSearch = async () => {
    const qry = searchQuery.trim().toLowerCase();
    const originalQry = searchQuery.trim();
    if (qry.length < 2) return;

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const usersCol = collection(firestore, "users");
      
      const queries = [
        query(usersCol, where("email", "==", qry), limit(5)),
        query(usersCol, where("email", ">=", qry), where("email", "<=", qry + "\uf8ff"), limit(10)),
        query(usersCol, where("displayName", ">=", originalQry), where("displayName", "<=", originalQry + "\uf8ff"), limit(10)),
        query(usersCol, where("searchName", ">=", qry), where("searchName", "<=", qry + "\uf8ff"), limit(10))
      ];

      const snapshots = await Promise.all(queries.map(q => getDocs(q)));
      const resultsMap = new Map();
      
      snapshots.forEach(snap => {
        snap.forEach(d => {
          const data = d.data();
          if (d.id !== user?.uid && !data.isAnonymous) {
            resultsMap.set(d.id, { id: d.id, ...data });
          }
        });
      });

      const finalResults = Array.from(resultsMap.values()).map(u => ({
        ...u,
        isCompanion: companionIds.has(u.id),
      })).sort((a, b) => {
        if (a.isCompanion && !b.isCompanion) return -1;
        if (!a.isCompanion && b.isCompanion) return 1;
        return (a.displayName || "").localeCompare(b.displayName || "");
      });
      
      setSearchResults(finalResults);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    const timeoutId = setTimeout(handleSearch, 600);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
      }, { merge: true });
      
      await deleteDoc(doc(firestore, "users", user.uid, "requests", request.senderId));

      toast({ title: "Friends connected!", description: `You are now friends with ${request.senderName}` });
    } catch (error: any) {
       console.error(error);
       toast({ variant: "destructive", title: "Action failed", description: "Could not accept request." });
    }
  };

  const handleDeclineRequest = async (request: any) => {
    if (!user?.uid || !firestore) return;
    try {
      await deleteDoc(doc(firestore, "users", user.uid, "requests", request.senderId));
      await deleteDoc(doc(firestore, "users", request.senderId, "friends", user.uid)).catch(() => {});
      toast({ title: "Request declined" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Action failed", description: "Could not decline request." });
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.uid || !firestore) return;
    try {
      await deleteDoc(doc(firestore, "users", user.uid, "friends", friendId));
      await deleteDoc(doc(firestore, "users", friendId, "friends", user.uid)).catch(() => {});
      await deleteDoc(doc(firestore, "users", friendId, "requests", user.uid)).catch(() => {});
      
      toast({ title: "Connection removed" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Action failed", description: "Could not remove friend." });
    }
  };

  const acceptedFriends = friends.filter(f => f.status === "accepted");
  const pendingInvitations = friends.filter(f => f.status === "pending");

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-10 bg-foreground text-background rounded-b-[2.5rem] shadow-lg shadow-black/10">
        <h1 className="text-3xl font-bold text-background mb-6">Friends</h1>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input 
            placeholder="Search by name or email..." 
            className="h-14 pl-12 pr-12 rounded-2xl bg-white/10 border-white/10 shadow-inner focus-visible:ring-accent text-white placeholder:text-white/40 font-semibold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent mr-2" />
            ) : searchQuery.trim().length >= 2 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl text-accent hover:bg-white/10"
                onClick={handleSearch}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {(searchResults.length > 0 || (hasSearched && !isSearching)) && (
          <Card className="mt-4 border-none shadow-2xl bg-white rounded-3xl overflow-hidden divide-y animate-in fade-in slide-in-from-top-2 duration-300 text-foreground">
            {searchResults.length > 0 ? (
              searchResults.map(result => {
                const friendship = friends.find(f => f.friendId === result.id);
                const isAccepted = friendship?.status === "accepted";
                const isPending = friendship?.status === "pending";

                return (
                  <div key={result.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border shadow-sm">
                        <AvatarImage src={result.photoURL} className="object-cover" />
                        <AvatarFallback className="text-foreground font-bold">{result.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{result.displayName}</p>
                          {result.isCompanion && (
                            <Badge className="bg-primary/10 text-primary text-[8px] font-bold px-1.5 h-4 border-none">Companion</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5" />
                          {result.email}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className={cn(
                        "rounded-full h-9 px-4 font-bold text-xs shadow-sm active:scale-95 transition-all",
                        (isAccepted || isPending) ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-primary text-white hover:bg-primary/90"
                      )} 
                      onClick={() => !isAccepted && !isPending && handleSendRequest(result)}
                      disabled={isAccepted || isPending}
                    >
                      {isAccepted ? "Connected" : isPending ? "Pending" : "Add Friend"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-muted-foreground">No explorers found</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Try a different name or email</p>
              </div>
            )}
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
                        <h3 className="font-bold text-sm text-foreground">{request.senderName}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 rounded-lg px-3 bg-primary" onClick={() => handleAcceptRequest(request)}>Accept</Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 rounded-lg px-3 text-muted-foreground"
                        onClick={() => handleDeclineRequest(request)}
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

        {pendingInvitations.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Pending invitations</h2>
            <div className="grid gap-3">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden opacity-80">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={invitation.friendPhoto} />
                        <AvatarFallback>{invitation.friendName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{invitation.friendName}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Waiting for response
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 rounded-lg px-3 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFriend(invitation.friendId)}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Your friends</h2>
          {acceptedFriends.length > 0 ? (
            <div className="grid gap-3">
              {acceptedFriends.map((friend) => {
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
                          <h3 className="font-bold text-base text-foreground">{friend.friendName}</h3>
                        </div>
                      </div>
                      
                      <DropdownMenu onOpenChange={(open) => setActiveMenuName(open ? friend.friendName : null)}>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-primary/10 rounded-xl">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px] p-2">
                          <DropdownMenuItem 
                            className="rounded-xl flex items-center gap-2 cursor-pointer py-2.5 focus:bg-primary/10"
                            onClick={() => router.push(`/users/${friend.friendId}`)}
                          >
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
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-muted/50 px-10">
               <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <UserPlus className="h-7 w-7 text-muted-foreground/40" />
               </div>
               <h3 className="text-lg font-bold text-foreground">No friends yet</h3>
               <p className="text-sm text-muted-foreground mt-1 mb-8 leading-relaxed">Connect with your travel buddies to start splitting expenses.</p>
               <Button 
                variant="default" 
                className="font-bold rounded-2xl px-10 h-14 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform hover:scale-105"
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
