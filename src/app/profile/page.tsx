
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Shield, Bell, CreditCard, LogOut, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import { signOut, updateProfile } from "firebase/auth";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setEditedName(user.displayName);
    }
  }, [user]);

  if (userLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editedName.trim() || (user?.isAnonymous ? "Guest Explorer" : "Explorer")
      });
      toast({
        title: "Profile updated",
        description: "Your display name has been saved successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const accountDetails = [
    { 
      icon: User, 
      label: "Display Name", 
      value: user?.displayName || (user?.isAnonymous ? "Guest Explorer" : "User"),
      editable: true 
    },
    { 
      icon: Mail, 
      label: "Email Address", 
      value: user?.email || (user?.isAnonymous ? "Guest Account" : "N/A"),
      editable: false 
    },
    { 
      icon: Shield, 
      label: "Security", 
      value: user?.isAnonymous ? "Guest - Unlinked" : "Protected by Google",
      editable: false 
    },
    { icon: Bell, label: "Notifications", value: "Push & Email", editable: false },
    { icon: CreditCard, label: "Default Currency", value: "Indian Rupee (₹)", editable: false },
  ];

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
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {user?.displayName?.[0] || (user?.isAnonymous ? "G" : "U")}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">
              {user?.displayName || (user?.isAnonymous ? "Guest Explorer" : "Explorer")}
            </h2>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              {user?.isAnonymous ? "Anonymous Session" : "Google Verified Account"}
            </p>
          </div>
          
          <div className="flex gap-2">
            {!isEditing ? (
              <Button 
                variant="outline" 
                className="rounded-full px-8 font-bold border-primary text-primary hover:bg-primary/5" 
                onClick={() => setIsEditing(true)}
              >
                Manage Account
              </Button>
            ) : (
              <>
                <Button 
                  className="rounded-full px-6 font-bold flex items-center gap-2" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  className="rounded-full px-6 font-bold flex items-center gap-2" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(user?.displayName || "");
                  }}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Account details</h3>
          <div className="grid gap-3">
            {accountDetails.map((item) => (
              <Card key={item.label} className={cn(
                "border-none shadow-sm bg-white rounded-2xl transition-all duration-300",
                isEditing && item.editable ? "ring-2 ring-primary ring-offset-2" : ""
              )}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{item.label}</p>
                      {isEditing && item.editable ? (
                        <Input 
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-8 mt-1 border-none bg-muted/50 focus-visible:ring-primary text-sm font-bold p-0 px-2"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm font-bold text-foreground">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button 
          variant="destructive" 
          className="w-full h-14 rounded-2xl gap-2 font-bold shadow-lg shadow-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>

        <p className="text-center text-[10px] text-muted-foreground font-medium px-8 leading-relaxed">
          {user?.isAnonymous 
            ? "Your data is currently stored locally. Sign in to link your data to a permanent account."
            : "Some profile details are synced automatically from your Google account."}
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
