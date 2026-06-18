
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { TripsProvider } from "@/context/trips-context";
import { FirebaseClientProvider } from "@/firebase";
import { AuthGuard } from "@/components/auth-guard";

export const metadata: Metadata = {
  title: 'Travex | Smart Travel Expenses',
  description: 'Intelligent expense capture and splitting for modern travelers.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Travex',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B6E82',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="https://picsum.photos/seed/travex/180/180" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen text-foreground">
        <FirebaseClientProvider>
          <AuthGuard>
            <TripsProvider>
              {children}
            </TripsProvider>
          </AuthGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
