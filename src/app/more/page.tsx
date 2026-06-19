"use client";

import { 
  Compass, 
  UserCircle, 
  Users, 
  LogOut, 
  ChevronRight, 
  MessageSquare, 
  ShieldCheck,
  ArrowRight,
  Heart,
  Trash2,
  AlertTriangle,
  X,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signOut, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MorePage() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !firestore) return;
    setIsDeleting(true);

    try {
      const userId = auth.currentUser.uid;
      // 1. Delete Firestore profile
      await deleteDoc(doc(firestore, "users", userId)).catch(() => {});
      
      // 2. Delete Auth User
      await deleteUser(auth.currentUser);

      toast({
        title: "Account deleted",
        description: "Your account and profile data have been removed.",
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Deletion error:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast({
          variant: "destructive",
          title: "Action required",
          description: "For security, please sign out and sign back in before deleting your account.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Deletion failed",
          description: error.message || "Could not delete account.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isGuest = user?.isAnonymous;

  const SECTIONS = [
    {
      title: "Account",
      items: [
        { 
          title: "My Profile", 
          description: "Manage your name, avatar, and family groups", 
          icon: UserCircle, 
          href: "/profile",
          color: "bg-primary/10 text-primary"
        },
        { 
          title: "Friends", 
          description: "Manage connections and friend requests", 
          icon: Users, 
          href: "/friends",
          color: "bg-blue-100 text-blue-600"
        },
      ]
    },
    {
      title: "Discovery",
      items: [
        { 
          title: "Explore", 
          description: "Find inspiration for your next adventure", 
          icon: Compass, 
          href: "/explore",
          color: "bg-orange-100 text-orange-600"
        },
      ]
    },
    {
      title: "Help & Feedback",
      items: [
        { 
          title: "Send Feedback", 
          description: "Help us make Travex better", 
          icon: MessageSquare, 
          href: "mailto:hello@travex.app",
          color: "bg-teal-100 text-teal-600"
        },
      ]
    }
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-32">
      <header className="px-safe-pad pt-12 pb-8 bg-white border-b rounded-b-[2.5rem] shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">More</h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">App settings and travel tools</p>
      </header>

      <main className="px-safe-pad pt-6 space-y-8">
        {/* Guest Nudge */}
        {isGuest && (
          <Card className="border-none shadow-2xl bg-accent rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white leading-tight tracking-tight">Don't lose your trips</h3>
                  <p className="text-[11px] text-white font-medium leading-relaxed">
                    You're using a guest account. Connect to Google to safely sync your travel data and access it from any device.
                  </p>
                </div>
                <Link href="/profile" className="block">
                  <Button className="w-full h-14 rounded-2xl bg-white text-foreground hover:bg-slate-50 border-none font-bold flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-6 w-6" alt="Google" />
                    Connect Google Account
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-4">
            <h3 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest ml-1">
              {section.title}
            </h3>
            <div className="space-y-3">
              {section.items.map((option) => (
                <Link 
                  key={option.title} 
                  href={option.href}
                  className="block transition-all active:scale-[0.98]"
                >
                  <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", option.color)}>
                          <option.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-foreground">{option.title}</h3>
                          <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">{option.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 pb-8 space-y-4">
          <button onClick={handleSignOut} className="w-full text-left active:scale-[0.98] transition-transform">
            <Card className="border-none shadow-sm hover:bg-destructive/5 transition-colors bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4 text-destructive">
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Sign Out</h3>
                  <p className="text-[10px] opacity-70 font-medium">Log out from your current session</p>
                </div>
              </CardContent>
            </Card>
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full text-left active:scale-[0.98] transition-transform">
                <Card className="border-none shadow-sm hover:bg-destructive/10 transition-colors bg-white rounded-2xl overflow-hidden border-2 border-destructive/5">
                  <CardContent className="p-4 flex items-center gap-4 text-destructive">
                    <div className="h-11 w-11 rounded-xl bg-destructive/20 flex items-center justify-center">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Delete Account</h3>
                      <p className="text-[10px] opacity-70 font-medium">Permanently remove all your data</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="h-52 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
                 <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
                    <AlertTriangle className="h-28 w-28 text-accent animate-pulse" strokeWidth={1.5} />
                 </div>
                 <AlertDialogCancel className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20 border-none p-0">
                    <X className="h-5 w-5" />
                 </AlertDialogCancel>
              </div>

              <div className="p-8 pt-10 space-y-7 text-center">
                <div className="space-y-4">
                  <AlertDialogTitle className="text-3xl font-bold tracking-tight text-foreground">
                    Are you sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
                    This action <span className="text-destructive font-extrabold">cannot be undone</span>. All your trips, friend connections, and profile data will be permanently removed.
                  </AlertDialogDescription>
                </div>

                <div className="space-y-4 pt-4 flex flex-col items-center">
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-base gap-3 shadow-lg shadow-destructive/20 transition-all active:scale-95"
                  >
                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                    Delete Permanently
                  </AlertDialogAction>
                  <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted transition-all border-none bg-transparent">
                    Cancel
                  </AlertDialogCancel>
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          <div className="text-center pt-6 space-y-1">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
              <span>Made with</span>
              <Heart className="h-2.5 w-2.5 fill-current" />
              <span>for travelers</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/20">Version 1.2.0 • Travex App</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
