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
           {/* Visual Area - PASTE YOUR CUSTOM SVG BELOW */}
           <div className="relative z-10 flex flex-col items-center text-center px-6">
              <div className="h-24 w-24 flex items-center justify-center mb-4">
                {/* 
                   REPLACE THIS SVG BLOCK WITH YOUR OWN 
                   Make sure to keep the classes for sizing/animation if needed 
                */}
                <svg 
                  viewBox="0 0 24 24" 
                  className="h-16 w-16 text-accent animate-pulse" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Security Nudge</p>
           </div>
           
           <button 
             onClick={() => onOpenChange(false)}
             className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all border-none"
           >
             <X className="h-4 w-4" />
           </button>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground leading-tight">
              Secure your adventure
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
              You're currently using a <span className="font-bold text-primary">Guest Account</span>. Link to Google to ensure you never lose access to your trips and balances.
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
              className="w-full h-12 rounded-2xl font-bold text-muted-foreground text-sm hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              Continue as guest
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
