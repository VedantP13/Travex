
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Mail, 
  Shield, 
  Bell, 
  CreditCard, 
  LogOut, 
  Loader2,
  ChevronRight,
  Pencil,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { signOut, updateProfile, GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

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
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhotoURL, setEditedPhotoURL] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);

  // Listen for the high-quality Firestore profile
  useEffect(() => {
    if (!user?.uid || !firestore) return;

    const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setFirestoreProfile(snap.data());
      }
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  useEffect(() => {
    const currentName = firestoreProfile?.displayName || user?.displayName || "";
    const currentPhoto = firestoreProfile?.photoURL || user?.photoURL || "";
    
    setEditedName(currentName || (user?.isAnonymous ? "Guest Explorer" : "Explorer"));
    setEditedPhotoURL(currentPhoto);
  }, [user, firestoreProfile]);

  /**
   * Resizes an image to a reasonable size for high-quality Firestore storage.
   */
  const resizeImage = (dataUrl: string, size: number, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas error");

        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject("Image load error");
    });
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !firestore) return;

    setIsSaving(true);
    const userId = auth.currentUser.uid;
    const userDocRef = doc(firestore, "users", userId);

    try {
      // 1. Prepare high-quality version for Firestore
      const highResPhoto = editedPhotoURL.startsWith('data:') 
        ? await resizeImage(editedPhotoURL, 300, 0.8) // 300x300 is plenty for Firestore
        : editedPhotoURL;

      // 2. Prepare tiny version for Firebase Auth (limit 2KB)
      const lowResPhoto = editedPhotoURL.startsWith('data:')
        ? await resizeImage(editedPhotoURL, 50, 0.5) // 50x50 very low quality to be safe
        : editedPhotoURL;

      // 3. Update Firestore (High Quality)
      const profileData = {
        displayName: editedName.trim(),
        photoURL: highResPhoto,
        updatedAt: serverTimestamp(),
      };

      setDoc(userDocRef, profileData, { merge: true })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: profileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      // 4. Update Firebase Auth (Low Quality / Standard)
      await updateProfile(auth.currentUser, {
        displayName: editedName.trim(),
        photoURL: lowResPhoto.length < 2000 ? lowResPhoto : "" // Fallback if still too big
      });

      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setIsLinking(true);
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(auth.currentUser, provider);
      toast({
        title: "Account linked!",
        description: "Your data is now safely synced with your Google account.",
      });
    } catch (error: any) {
      console.error("Linking failed", error);
      toast({
        variant: "destructive",
        title: "Linking failed",
        description: error.message || "Could not link Google account.",
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
  const displayPhoto = isEditing ? editedPhotoURL : (firestoreProfile?.photoURL || user?.photoURL || "");
  const displayName = isEditing ? editedName : (firestoreProfile?.displayName || user?.displayName || (isGuest ? "Guest Explorer" : "Explorer"));

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
                src={displayPhoto} 
                className="object-cover"
              />
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                {displayName[0]}
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
                      onClick={() => fileInputRef.current?.click()}
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
                  {displayName}
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
