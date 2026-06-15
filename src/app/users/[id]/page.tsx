
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Mail, 
  Shield, 
  MapPin, 
  UserX, 
  Loader2,
  ChevronRight,
  Compass,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useUser, useFirestore } from "@/firebase";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useTrips } from "@/context/trips-context";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getTripImage } from "@/lib/image-utils";
import { BottomNav } from "@/components/bottom-nav";

export default function UserProfilePage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { trips, loading: tripsLoading } = useTrips();

  const [targetUser, setTargetUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!id || !firestore) return;

    const unsub = onSnapshot(doc(firestore, "users", id as string), (snap) => {
      if (snap.exists()) {
        setTargetUser({ id: snap.id, ...snap.data() });
      } else {
        toast({ title: "User not found", variant: "destructive" });
        router.push('/friends');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id, firestore, router, toast]);

  const handleRemoveFriend = async () => {
    if (!currentUser?.uid || !firestore || !id) return;
    setIsRemoving(true);
    try {
      await deleteDoc(doc(firestore, "users", currentUser.uid, "friends", id as string));
      await deleteDoc(doc(firestore, "users", id as string, "friends", currentUser.uid)).catch(() => {});
      toast({ title: "Friend removed" });
      router.push('/friends');
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsRemoving(false);
    }
  };

  const mutualTrips = trips.filter(t => t.participantIds?.includes(id));

  if (loading || tripsLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-32">
      <header className="px-safe-pad pt-10 pb-6 bg-white border-b sticky top-0 z-20 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Explorer Profile</h1>
      </header>

      <main className="px-safe-pad pt-8 space-y-10">
        <section className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32 border-[6px] border-white shadow-2xl ring-1 ring-black/5">
            <AvatarImage src={targetUser?.photoURL} className="object-cover" />
            <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
              {targetUser?.displayName?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {targetUser?.displayName}
            </h2>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest ml-1">About Explorer</h3>
          <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Contact</p>
                  <p className="text-sm font-bold">{targetUser?.email || "Email hidden"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Status</p>
                  <p className="text-sm font-bold">Verified Member</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end ml-1">
            <h3 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">Mutual Journeys</h3>
            <span className="text-[10px] font-bold text-primary">{mutualTrips.length} shared trips</span>
          </div>

          <div className="grid gap-3">
            {mutualTrips.length > 0 ? mutualTrips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:bg-muted/10 transition-colors">
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className="h-14 w-20 rounded-xl overflow-hidden shrink-0">
                      <img 
                        src={getTripImage(trip.name, trip.image, trip.imageHint)} 
                        className="h-full w-full object-cover"
                        alt={trip.name}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{trip.name}</h4>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{trip.date || "Ongoing"}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/30 mr-2" />
                  </CardContent>
                </Card>
              </Link>
            )) : (
              <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-muted/30 px-6">
                <div className="h-12 w-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Compass className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <p className="text-xs font-bold text-muted-foreground">No shared trips yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Start a new adventure together!</p>
              </div>
            )}
          </div>
        </section>

        <div className="pt-6">
          <Button 
            variant="ghost" 
            className="w-full h-14 rounded-2xl gap-3 font-bold text-destructive hover:bg-destructive/10 transition-all"
            onClick={handleRemoveFriend}
            disabled={isRemoving}
          >
            {isRemoving ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserX className="h-5 w-5" />}
            Remove from friends
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
