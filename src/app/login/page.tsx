
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, Loader2 } from 'lucide-react';
import { AnimatedCompass } from '@/components/animated-compass';

export default function LoginPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) {
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
          <h1 className="text-4xl font-bold tracking-tight">Travex</h1>
          <p className="text-muted-foreground font-medium">Smart splitting for modern explorers.</p>
        </div>

        <Card className="w-full bg-white/5 border-white/10 backdrop-blur-md rounded-[2.5rem] p-4">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-background">Welcome back</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Join your friends and start splitting expenses effortlessly on your next adventure.
              </p>
            </div>
            
            <Button 
              onClick={handleLogin}
              className="w-full h-16 rounded-2xl bg-white text-foreground hover:bg-white/90 text-lg font-bold shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-6 w-6" alt="Google" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground opacity-50 uppercase tracking-widest font-bold">
          Free • Fast • Secure
        </p>
      </div>
    </div>
  );
}
