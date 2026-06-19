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
  Heart
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function MorePage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
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
        { 
          title: "Privacy & Terms", 
          description: "View our data and security policies", 
          icon: ShieldCheck, 
          href: "#",
          disabled: true,
          color: "bg-slate-100 text-slate-600"
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
                  <h3 className="text-xl font-black text-foreground leading-tight tracking-tight">Don't lose your trips</h3>
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
                  href={option.disabled ? "#" : option.href}
                  className={cn(
                    "block transition-all active:scale-[0.98]",
                    option.disabled && "cursor-not-allowed opacity-50"
                  )}
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
                      {!option.disabled && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 pb-8 space-y-6">
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

          <div className="text-center space-y-1">
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
