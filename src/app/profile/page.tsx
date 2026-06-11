
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Shield, Bell, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useUser();
  const auth = useAuth();

  if (loading) {
    return <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  const settings = [
    { icon: User, label: "Display Name", value: user?.displayName || (user?.isAnonymous ? "Guest Explorer" : "User") },
    { icon: Mail, label: "Email Address", value: user?.email || (user?.isAnonymous ? "Guest Account" : "N/A") },
    { icon: Shield, label: "Security", value: user?.isAnonymous ? "Guest - Unlinked" : "Protected by Google" },
    { icon: Bell, label: "Notifications", value: "Push & Email" },
    { icon: CreditCard, label: "Default Currency", value: "Indian Rupee (₹)" },
  ];

  const handleEditProfile = () => {
    toast({
      title: "Settings",
      description: "Profile editing is currently managed through your account provider.",
    });
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad py-6 flex items-center bg-white border-b sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Profile</h1>
      </header>

      <main className="px-safe-pad pt-8 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback>{user?.displayName?.[0] || (user?.isAnonymous ? "G" : "U")}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{user?.displayName || (user?.isAnonymous ? "Guest Explorer" : "Explorer")}</h2>
            <p className="text-muted-foreground text-sm">
              {user?.isAnonymous ? "Anonymous Session" : "Google Verified Account"}
            </p>
          </div>
          <Button variant="outline" className="rounded-full px-8" onClick={handleEditProfile}>Manage Account</Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground tracking-tight ml-1">Account details</h3>
          <div className="grid gap-3">
            {settings.map((item) => (
              <Card key={item.label} className="border-none shadow-sm bg-white rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">{item.label}</p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button 
          variant="destructive" 
          className="w-full h-14 rounded-2xl gap-2 font-bold"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
