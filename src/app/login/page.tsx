
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, linkWithPopup, updateProfile } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, Loader2 } from 'lucide-react';
import { AnimatedCompass } from '@/components/animated-compass';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
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
      // If there is already an anonymous user, link the account instead of signing in fresh
      // This ensures guest data (like trips) is preserved and attached to the Google account.
      if (auth.currentUser?.isAnonymous) {
        result = await linkWithPopup(auth.currentUser, provider);
      } else {
        result = await signInWithPopup(auth, provider);
      }

      const userInstance = result.user;
      const googleInfo = userInstance.providerData.find(p => p.providerId === 'google.com');

      if (googleInfo) {
        // Automatically update the main profile with Google's info
        await updateProfile(userInstance, {
          displayName: googleInfo.displayName,
          photoURL: googleInfo.photoURL
        });
        
        toast({
          title: "Welcome back!",
          description: `Logged in as ${googleInfo.displayName}. Your profile has been synced.`,
        });
      }

      router.push('/');
    } catch (error: any) {
      // Handle the case where the Google account is already linked to another user
      if (error.code === 'auth/credential-already-in-use') {
        toast({
          variant: "destructive",
          title: "Account already exists",
          description: "This Google account is already linked to another Travex user.",
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Login failed:', error);
        
        let errorMessage = "Could not sign in with Google.";
        if (error.code === 'auth/unauthorized-domain') {
          errorMessage = "Domain not authorized. Please add authorized domains in Firebase Console.";
        }

        toast({
          variant: "destructive",
          title: "Login failed",
          description: errorMessage,
        });
      }
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInAnonymously(auth);
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
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AnimatedCompass className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-foreground text-background p-safe-pad justify-center">
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="h-24 w-24 bg-accent rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-accent/20">
          <Compass className="h-12 w-12 text-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">Travex</h1>
          <p className="text-muted-foreground font-medium">Smart splitting for modern explorers.</p>
        </div>

        <Card className="w-full bg-white/5 border-white/10 backdrop-blur-md rounded-[2.5rem] p-4">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Welcome</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Join your friends and start splitting expenses effortlessly on your next adventure.
              </p>
            </div>
            
            <div className="space-y-3 pt-2">
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full h-16 rounded-2xl bg-white text-foreground hover:bg-white/90 text-lg font-bold shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-6 w-6" alt="Google" />
                    Sign in with Google
                  </>
                )}
              </Button>

              <Button 
                variant="ghost"
                onClick={handleGuestLogin}
                disabled={isLoggingIn}
                className="w-full h-12 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-bold"
              >
                Continue as Guest
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground opacity-50 uppercase tracking-widest font-bold">
          Smart • Seamless • Simple
        </p>
      </div>
    </div>
  );
}
