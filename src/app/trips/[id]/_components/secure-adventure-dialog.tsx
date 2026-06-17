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
      <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-accent overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-80 bg-foreground relative flex flex-col items-center justify-center overflow-hidden shrink-0">
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

           <div className="relative z-10 flex flex-col items-center text-center w-full px-6">
              <div className="w-full max-w-[480px] aspect-[4/3] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="350 200 150 150" className="w-full h-full text-accent fill-current drop-shadow-2xl">
                   <g>
                     <title>Layer 1</title>
                     <g>
                       <title>leisure</title>
                       <path fillRule="evenodd" d="m406.2729,305.04381l6.45,-1.6l2.58,-1.32l4.94,-5.65a2.44,2.44 0 0 1 3.68,2.87l-3.31,5.12c-1.75,2.72 -1.39,2.17 -4.34,3.58c-1.69,0.82 -3.71,1.68 -5.63,2.39l7.52,6.22c3.15,-0.43 6.21,-1 9.31,-1.45c3.55,-0.52 3.62,-0.06 6.23,2l12.22,9.54c3.23,2.85 0.79,5.79 -2.11,5.27l-11.43,-8.08c-2.54,-1.79 -2.09,-1.57 -5.17,-0.41c-3.5,1.32 -7.4,3.15 -11.11,3c-4.54,-0.18 -5.54,-2.82 -8.65,-5.52a26.28,26.28 0 0 1 -4.89,-4.91c-0.77,-1.19 -1.58,-2.16 -2.07,-3.13a3.58,3.58 0 0 1 0,-3.59c1.29,-2.47 2.11,-3.5 5.82,-4.33l-0.04,0zm-31.21,-17.7l0,50.46l3.4,0l7.42,-4.81l-3.94,0l0,-5l21.14,0l-13.74,-15.21l3.7,-3.33l16.75,18.56l20.2,0a2.46,2.46 0 0 1 1.88,0.86l15.74,8.94l13.83,0l0,6.83l-122.48,0l0,-6.84l30.75,0l0,-50.46l-29.21,0a1.94,1.94 0 0 1 -1.94,-1.92a1.28,1.28 0 0 1 0,-0.19a21.91,21.91 0 0 1 2.58,-10.83c13.88,-25.06 46.84,-25.47 61.92,-0.77a21.46,21.46 0 0 1 3,11.79a1.92,1.92 0 0 1 -1.89,1.92l-29.11,0zm10.13,50.47l55.37,0l-11.59,-4.81l-36.36,0l-7.42,4.81zm-1.52,-76.34c4.31,6.23 6.46,14.54 6.56,22l11.94,0c-0.61,-9.13 -10.2,-18.23 -18.5,-22zm-5.66,-2.45a33.86,33.86 0 0 0 -3.66,-0.43l0,24.9l12,0c-0.07,-5.69 -3.61,-21.43 -8.36,-24.47l0.02,0zm-7.55,-0.44a32.94,32.94 0 0 0 -3.61,0.4c-4.82,3.05 -8.29,18.76 -8.41,24.5l12,0l0,-24.9l0.02,0zm-9.25,2.76c-8.36,3.79 -18.08,12.65 -18.71,22.15l12.06,0c0.08,-7.39 2.28,-16 6.62,-22.12l0.03,-0.03zm38.1,31.09a6.26,6.26 0 1 0 6.82,5.64a6.27,6.27 0 0 0 -6.82,-5.64z" />
                     </g>
                     <g stroke="null">
                       <path transform="rotate(-176.937 427.715 292.906)" d="m437.91284,293.49582c-1.42122,1.42117 -3.29235,2.13174 -5.16164,2.13174c-1.32571,0 -2.65215,-0.35742 -3.81844,-1.07208l-10.63037,10.63042l-2.81827,-2.81832l1.40918,-1.40918l-1.50874,-1.50869l1.82079,-1.82089l1.50879,1.50874l0.46281,-0.46281l-2.23274,-2.23274l1.97521,-1.97521l2.23274,2.23274l4.96359,-4.96359c-0.71013,-1.16369 -1.06539,-2.48979 -1.06544,-3.81724l-0.00809,0c0,-1.86924 0.71052,-3.74027 2.13164,-5.1614c1.42161,-1.42142 3.29254,-2.13212 5.16183,-2.13212c1.86924,0 3.74042,0.71071 5.16159,2.13188l0.4157,0.41575c1.42108,1.42108 2.13155,3.29211 2.13155,5.16135l-0.00804,0c-0.0001,1.87449 -0.7082,3.74615 -2.12365,5.16164zm-2.89938,-2.89875c0.62579,-0.62589 0.93867,-1.44603 0.93867,-2.26289l-0.00809,0c0,-0.82177 -0.31008,-1.6422 -0.93014,-2.26226l-0.41575,-0.4157c-0.62021,-0.62026 -1.44063,-0.93053 -2.26246,-0.93053c-0.82187,0 -1.64225,0.31027 -2.2625,0.93053c-0.6204,0.6204 -0.93048,1.44068 -0.93048,2.2625l-0.00809,0c0,0.81686 0.31297,1.637 0.93848,2.2625l0.41575,0.41575c0.62006,0.61997 1.44039,0.93005 2.26236,0.93005c0.82187,0 1.6423,-0.31008 2.26226,-0.92995z" />
                     </g>
                   </g>
                </svg>
              </div>
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
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-foreground/80 px-4">
              You're currently using a <span className="font-bold text-foreground">Guest Account</span>. Link to Google to ensure you never lose access to your trips, expenses, and split history.
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
            <button 
              className="w-full h-12 rounded-2xl font-bold text-foreground/60 text-sm hover:bg-black/5 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Continue as guest
            </button>
          </div>
          
          <p className="text-[10px] text-foreground/50 font-medium px-6 leading-tight">
            Account linking preserves all your existing data across any device you sign in to.
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
