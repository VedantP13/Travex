'use client';

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { GoogleAuthProvider, linkWithPopup, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface SecureAdventureDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecureAdventureDialog({ isOpen, onOpenChange }: SecureAdventureDialogProps) {
  const [isLinking, setIsLinking] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setIsLinking(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await linkWithPopup(auth.currentUser, provider);
      const linkedUser = result.user;
      const googleInfo = linkedUser.providerData.find(p => p.providerId === 'google.com');
      
      if (googleInfo) {
        // Sync user profile state
        await updateProfile(linkedUser, {
          displayName: googleInfo.displayName,
          photoURL: googleInfo.photoURL
        });

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

        toast({
          title: "Account secured!",
          description: "Your trips are now safely synced to your Google account.",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Linking failed",
          description: error.code === 'auth/credential-already-in-use' 
            ? "This Google account is already linked to another profile." 
            : "Could not connect Google account.",
        });
      }
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-56 bg-foreground relative flex flex-col items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-10">
             <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
               <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="url(#grad-secure)" />
               <defs>
                 <linearGradient id="grad-secure" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" stopColor="white" />
                   <stop offset="100%" stopColor="transparent" />
                 </linearGradient>
               </defs>
             </svg>
           </div>

           <div className="relative z-10 flex flex-col items-center text-center px-6">
              <div className="h-28 w-28 flex items-center justify-center mb-4">
                <svg 
                  viewBox="0 0 128 128" 
                  className="h-20 w-20 text-accent animate-pulse drop-shadow-[0_0_15px_rgba(245,166,35,0.3)]"
                >
                  <circle cx="64" cy="64" r="60" fill="currentColor" fillOpacity="0.1" />
                  <path 
                    d="M64 14.5L24 28v32c0 24.7 17.1 47.8 40 53.5 22.9-5.7 40-28.8 40-53.5V28l-40-13.5z" 
                    fill="currentColor" 
                  />
                  <path 
                    d="M56 82.5l-18-18 5.7-5.7 12.3 12.3 26.3-26.3 5.7 5.7L56 82.5z" 
                    fill="white" 
                  />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Account Protection</p>
           </div>
           
           <button 
             onClick={() => onOpenChange(false)}
             className="absolute top-6 right-6 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all border-none"
           >
             <X className="h-5 w-5" />
           </button>
        </div>

        <div className="p-8 sm:p-10 text-center space-y-6">
          <div className="space-y-3">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground leading-tight px-2">
              Secure your adventure
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
              You're currently using a <span className="font-bold text-primary">Guest Account</span>. Link to Google to ensure you never lose access to your trips, expenses, and split history.
            </AlertDialogDescription>
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              className="w-full h-14 rounded-2xl bg-white text-foreground hover:bg-slate-50 border border-slate-200 font-bold text-base flex items-center justify-center gap-3 shadow-md active:scale-95 transition-all"
              onClick={handleLinkGoogle}
              disabled={isLinking}
            >
              {isLinking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="Google" />
                  Link with Google
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl font-bold text-muted-foreground text-sm hover:bg-muted transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Continue as guest
            </Button>
          </div>
          
          <p className="text-[10px] text-muted-foreground/50 font-medium px-6 leading-tight">
            Account linking preserves all your existing data across any device you sign in to.
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
