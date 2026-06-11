
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Shield, 
  Bell, 
  CreditCard, 
  LogOut, 
  Check, 
  X, 
  Loader2,
  LogIn,
  ChevronRight,
  ShieldCheck,
  Pencil,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import { signOut, updateProfile, GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

const GUEST_AVATARS = [
  "https://picsum.photos/seed/avatar1/150/150",
  "https://picsum.photos/seed/avatar2/150/150",
  "https://picsum.photos/seed/avatar3/150/150",
  "https://picsum.photos/seed/avatar4/150/150",
  "https://picsum.photos/seed/avatar5/150/150",
];

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhotoURL, setEditedPhotoURL] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setEditedName(user.displayName);
    } else if (user?.isAnonymous) {
      setEditedName("Guest Explorer");
    }
    if (user?.photoURL) {
      setEditedPhotoURL(user.photoURL);
    }
  }, [user]);

  const resizeImage = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use JPEG with lower quality to stay under 2048 characters
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    
    // Final check for character limit
    if (editedPhotoURL.length > 2048) {
      toast({
        variant: "destructive",
        title: "Image too large",
        description: "Even after resizing, this image is too large for Firebase. Please try a simpler photo.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editedName.trim() || (user?.isAnonymous ? "Guest Explorer" : "Explorer"),
        photoURL: editedPhotoURL
      });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Update error:", error);
      let errorMessage = error.message || "Could not update profile.";
      
      if (error.code === 'auth/invalid-profile-attribute' || errorMessage.includes('too long')) {
        errorMessage = "The selected image is too high resolution. Please try a different photo or one of our avatars.";
      }

      toast({
        variant: "destructive",
        title: "Update failed",
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          // Resize to 80x80 to ensure it fits in the 2048 char limit
          const resized = await resizeImage(base64, 80, 80);
          setEditedPhotoURL(resized);
        } catch (e) {
          toast({
            variant: "destructive",
            title: "Processing failed",
            description: "Could not process the selected image.",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setIsLinking(true);
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(auth.currentUser, provider);
      toast({
        title: "Account linked!",
        description: "Your guest data is now safely synced with your Google account.",
      });
    } catch (error: any) {
      console.error("Linking failed", error);
      
      let errorMessage = "Could not link Google account.";
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized. Please add it to Authorized Domains in Firebase Console.";
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = "This Google account is already linked to another user.";
      }

      toast({
        variant: "destructive",
        title: "Linking failed",
        description: errorMessage,
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (userLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isGuest = user?.isAnonymous;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-32">
      <header className="px-safe-pad pt-10 pb-6 bg-white border-b sticky top-0 z-20 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
      </header>

      <main className="px-safe-pad pt-8 space-y-10">
        <section className="flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => setIsEditing(true)}>
            <Avatar className="h-28 w-28 border-[6px] border-white shadow-2xl ring-1 ring-black/5 transition-transform group-hover:scale-105 duration-300">
              <AvatarImage 
                src={isEditing ? editedPhotoURL : (user?.photoURL || "")} 
                className="object-cover"
              />
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                {user?.displayName?.[0] || (isGuest ? "G" : "U")}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg bg-primary text-white">
              <Pencil className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="text-center space-y-1.5 w-full max-w-[280px]">
            {isEditing ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="space-y-2 w-full">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">Choose avatar</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <div 
                      onClick={triggerFileUpload}
                      className="h-12 w-12 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all cursor-pointer flex-shrink-0"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    {GUEST_AVATARS.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setEditedPhotoURL(url)}
                        className={cn(
                          "h-12 w-12 rounded-xl border-2 transition-all cursor-pointer flex-shrink-0 overflow-hidden",
                          editedPhotoURL === url ? "border-primary scale-110 shadow-md" : "border-transparent opacity-60"
                        )}
                      >
                        <img src={url} alt={`Avatar ${idx}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1.5 w-full">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">Display name</p>
                  <Input 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-12 w-full text-center text-xl font-bold rounded-xl border-2 border-primary focus-visible:ring-0 bg-white"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="rounded-full px-6 font-bold h-9 bg-primary text-white" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full px-4 font-bold h-9" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">
                  {user?.displayName || (isGuest ? "Guest Explorer" : "Explorer")}
                </h2>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="mt-4 rounded-full px-8 font-bold h-11 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                  onClick={() => setIsEditing(true)}
                >
                  Edit profile details
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest ml-1">Account Information</h3>
          
          <div className="grid gap-3">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Email Address</p>
                    <p className={cn(
                      "text-sm font-bold tracking-tight",
                      isGuest ? "text-primary/60" : "text-foreground"
                    )}>
                      {isGuest ? "Not linked yet" : (user?.email || "N/A")}
                    </p>
                  </div>
                </div>
                {isGuest && (
                  <Button 
                    onClick={handleLinkGoogle} 
                    disabled={isLinking}
                    className="h-10 rounded-2xl bg-white text-foreground hover:bg-slate-50 border border-slate-200 font-bold px-4 flex items-center gap-3 shadow-md active:scale-95 transition-all"
                  >
                    {isLinking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-4 w-4" alt="Google" />
                    )}
                    <span className="text-xs">Link Google</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Security</p>
                    <p className={cn(
                      "text-sm font-bold tracking-tight",
                      isGuest ? "text-primary/60" : "text-foreground"
                    )}>
                      {isGuest ? "Link for safety" : "Cloud verified"}
                    </p>
                  </div>
                </div>
                {isGuest && (
                  <Button 
                    onClick={handleLinkGoogle} 
                    disabled={isLinking}
                    className="h-10 rounded-2xl bg-white text-foreground hover:bg-slate-50 border border-slate-200 font-bold px-4 flex items-center gap-3 shadow-md active:scale-95 transition-all"
                  >
                    {isLinking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-4 w-4" alt="Google" />
                    )}
                    <span className="text-xs">Link Google</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden opacity-60">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Notifications</p>
                    <p className="text-sm font-bold tracking-tight">Push & Email</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden opacity-60">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Currency</p>
                    <p className="text-sm font-bold tracking-tight">Indian Rupee (₹)</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="pt-6 space-y-4">
          <Button 
            variant="destructive" 
            className="w-full h-14 rounded-2xl gap-3 font-bold shadow-xl shadow-destructive/10 text-base"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>

          <p className="text-center text-[10px] text-muted-foreground font-medium px-8 leading-relaxed">
            {isGuest 
              ? "Your data is currently stored locally. Link your account to Google to protect your trips and access them from any device."
              : "Your travel data and splits are safely synced using your Google account identity."}
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
