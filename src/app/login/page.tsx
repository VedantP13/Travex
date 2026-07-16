
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, linkWithPopup, updateProfile } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';

const GUEST_ADJECTIVES = ["Brave", "Curious", "Vibrant", "Nomadic", "Infinite", "Wild", "Bold", "Swift", "Epic", "Hidden"];
const GUEST_NOUNS = ["Wanderer", "Voyager", "Nomad", "Pathfinder", "Scout", "Roamer", "Adventurer", "Explorer", "Seeker", "Trekker"];

export default function LoginPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading && !user.isAnonymous) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      let result;
      if (auth.currentUser?.isAnonymous) {
        result = await linkWithPopup(auth.currentUser, provider);
      } else {
        result = await signInWithPopup(auth, provider);
      }

      const userInstance = result.user;
      const googleInfo = userInstance.providerData.find(p => p.providerId === 'google.com');

      if (googleInfo) {
        await updateProfile(userInstance, {
          displayName: googleInfo.displayName,
          photoURL: googleInfo.photoURL
        });

        if (firestore) {
          const userDocRef = doc(firestore, "users", userInstance.uid);
          await setDoc(userDocRef, {
            displayName: googleInfo.displayName,
            searchName: (googleInfo.displayName || "").toLowerCase(),
            photoURL: googleInfo.photoURL,
            email: (googleInfo.email || "").toLowerCase(),
            isAnonymous: false,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        
        toast({
          title: "Welcome aboard!",
          description: `Successfully connected as ${googleInfo.displayName}. All your trips are safe and synced.`,
        });
      }

      router.push('/');
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        toast({
          variant: "destructive",
          title: "Account already exists",
          description: "This Google account is already linked to another Travex profile. Sign out and sign in directly with Google to access that data.",
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Login failed:', error);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Could not sign in with Google.",
        });
      }
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInAnonymously(auth);
      
      const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
      const noun = GUEST_NOUNS[Math.floor(Math.random() * GUEST_NOUNS.length)];
      const randomName = `${adj} ${noun}`;
      
      await updateProfile(result.user, {
        displayName: randomName
      });

      if (firestore) {
        await setDoc(doc(firestore, "users", result.user.uid), {
          displayName: randomName,
          searchName: randomName.toLowerCase(),
          isAnonymous: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      router.push('/');
    } catch (error: any) {
      console.error('Guest login failed:', error);
      toast({
        variant: "destructive",
        title: "Guest login failed",
        description: "Please check your internet connection and try again.",
      });
      setIsLoggingIn(false);
    }
  };

  if (loading || (user && !loading && !user.isAnonymous)) {
    return (
      <div className="max-w-md mx-auto min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-4">
        <Image src="/travex logo.png" alt="Travex Logo" width={64} height={64} priority />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-foreground text-background p-6 justify-center overflow-hidden">
      <div className="flex flex-col items-center text-center space-y-8 sm:space-y-12">
        {/* Brand Identity */}
        <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-1000 slide-in-from-top-4">
          <div className="relative transition-transform hover:scale-105 duration-700">
            <Image 
              src="/travex logo.png" 
              alt="Travex Logo" 
              width={140} 
              height={140} 
              priority
              className="drop-shadow-[0_25px_60px_rgba(245,166,35,0.25)] sm:w-[160px] sm:h-[160px]"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-accent">
              Travex
            </h1>
            <p className="text-muted-foreground font-medium text-sm sm:text-base opacity-70">
              Smart splitting for modern explorers.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="w-full bg-white/5 border-white/10 backdrop-blur-2xl rounded-[2.5rem] sm:rounded-[3.5rem] p-0 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <CardContent className="p-6 sm:p-10 space-y-6 sm:space-y-10">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-background tracking-tight">Welcome aboard</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium px-4">
                Connect with your travel buddies and start splitting expenses effortlessly.
              </p>
            </div>
            
            <div className="space-y-4 pt-2">
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-background text-foreground hover:bg-background/90 text-base sm:text-lg font-black shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 group border-none"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={24} height={24} alt="Google" className="group-hover:scale-110 transition-transform" />
                    Sign in with Google
                  </>
                )}
              </Button>

              <Button 
                variant="ghost"
                onClick={handleGuestLogin}
                disabled={isLoggingIn}
                className="w-full h-12 rounded-xl text-muted-foreground hover:text-background hover:bg-white/5 text-xs sm:text-sm font-bold tracking-tight transition-all"
              >
                Continue as Guest
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
