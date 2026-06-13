
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
  ImageIcon,
  Trash2,
  AlertTriangle,
  X,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { signOut, updateProfile, GoogleAuthProvider, linkWithPopup, deleteUser } from "firebase/auth";
import { doc, setDoc, onSnapshot, serverTimestamp, deleteDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { BottomNav } from "@/components/bottom-nav";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const [showSignOutWarning, setShowSignOutWarning] = useState(false);

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
      const highResPhoto = editedPhotoURL.startsWith('data:') 
        ? await resizeImage(editedPhotoURL, 400, 0.8)
        : editedPhotoURL;

      const lowResPhoto = editedPhotoURL.startsWith('data:')
        ? await resizeImage(editedPhotoURL, 60, 0.5)
        : editedPhotoURL;

      const profileData = {
        displayName: editedName.trim(),
        photoURL: highResPhoto,
        isAnonymous: auth.currentUser.isAnonymous,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, profileData, { merge: true })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: profileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      await updateProfile(auth.currentUser, {
        displayName: editedName.trim(),
        photoURL: lowResPhoto.length < 2000 ? lowResPhoto : ""
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
      const result = await linkWithPopup(auth.currentUser, provider);
      const linkedUser = result.user;
      
      // Automatically update the main profile with Google's info
      const googleInfo = linkedUser.providerData.find(p => p.providerId === 'google.com');
      
      if (googleInfo) {
        // 1. Update Firebase Auth Profile
        await updateProfile(linkedUser, {
          displayName: googleInfo.displayName,
          photoURL: googleInfo.photoURL
        });

        // 2. Update Firestore immediately for consistency
        if (firestore) {
          const userDocRef = doc(firestore, "users", linkedUser.uid);
          await setDoc(userDocRef, {
            displayName: googleInfo.displayName,
            photoURL: googleInfo.photoURL,
            email: googleInfo.email,
            isAnonymous: false,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        // 3. Update local UI state
        setEditedName(googleInfo.displayName || "");
        setEditedPhotoURL(googleInfo.photoURL || "");

        toast({
          title: "Account linked!",
          description: `Welcome ${googleInfo.displayName}! Your profile has been updated from Google.`,
        });
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Linking failed", error);
        let errorMessage = "Could not link Google account.";
        if (error.code === 'auth/unauthorized-domain') {
          errorMessage = "Domain not authorized. Please add authorized domains in Firebase Console.";
        } else if (error.code === 'auth/credential-already-in-use') {
          errorMessage = "This Google account is already linked to another Travex user. Please sign out and sign in with Google directly.";
        }
        toast({
          variant: "destructive",
          title: "Linking failed",
          description: errorMessage,
        });
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOut = async () => {
    if (user?.isAnonymous) {
      setShowSignOutWarning(true);
      return;
    }
    confirmSignOut();
  };

  const confirmSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !firestore) return;
    setIsDeleting(true);

    try {
      const userId = auth.currentUser.uid;
      await deleteDoc(doc(firestore, "users", userId)).catch(() => {});
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
          description: error.message || "Could not delete account. Please try again.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
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
        <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
      </header>

      <main className="px-safe-pad pt-6 space-y-10">
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
          </div>
        </section>

        <div className="pt-6 space-y-4">
          <Button 
            className="w-full h-14 rounded-2xl gap-3 font-bold bg-accent text-accent-foreground hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 text-base"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full h-14 rounded-2xl gap-3 font-bold shadow-xl shadow-destructive/20 text-base"
              >
                <Trash2 className="h-5 w-5" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="h-52 sm:h-60 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
                 <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
                    <AlertTriangle className="h-28 w-28 text-accent animate-pulse" strokeWidth={1.5} />
                 </div>
                 <AlertDialogCancel className="absolute right-4 top-4 sm:right-6 sm:top-6 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20 border-none p-0">
                    <X className="h-5 w-5" />
                 </AlertDialogCancel>
              </div>

              <div className="p-6 sm:p-8 pt-8 sm:pt-10 space-y-6 sm:space-y-7 text-center">
                <div className="space-y-3 sm:space-y-4">
                  <AlertDialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-2 sm:px-4">
                    This action <span className="text-destructive font-extrabold">cannot be undone</span>. This will permanently delete your travel profile and remove all your data from our servers.
                  </AlertDialogDescription>
                </div>

                <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4 flex flex-col items-center">
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-base gap-3 shadow-lg shadow-destructive/20 transition-all active:scale-95"
                  >
                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                    Delete Permanently
                  </AlertDialogAction>
                  <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted hover:text-foreground transition-all text-sm px-8 border-none bg-transparent">
                    Cancel
                  </AlertDialogCancel>
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={showSignOutWarning} onOpenChange={setShowSignOutWarning}>
            <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="h-52 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
                 <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
                    <AlertTriangle className="h-28 w-28 text-accent animate-pulse" strokeWidth={1.5} />
                 </div>
                 <AlertDialogCancel className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20 border-none p-0">
                    <X className="h-5 w-5" />
                 </AlertDialogCancel>
              </div>

              <div className="p-6 sm:p-8 pt-8 space-y-6 text-center">
                <div className="space-y-3">
                  <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                    Warning: Guest Account
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-2">
                    As a guest, signing out will <span className="text-destructive font-bold">permanently lock you out</span> of this account and all your trips. 
                    We recommend <span className="font-bold text-primary">Linking to Google</span> instead.
                  </AlertDialogDescription>
                </div>

                <div className="space-y-4 pt-2 flex flex-col items-center">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base gap-3 shadow-lg shadow-accent/20 transition-all active:scale-95"
                    onClick={handleLinkGoogle}
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.87 14.13c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.97l3.69-2.84z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.49 6.13-4.49z" />
                    </svg>
                    Link to Google
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-destructive/20 transition-all active:scale-95" 
                    onClick={confirmSignOut}
                  >
                    Sign out anyway
                  </Button>
                  <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted border-none bg-transparent">
                    Stay Logged In as Guest
                  </AlertDialogCancel>
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>

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
