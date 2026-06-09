
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { TripsProvider } from "@/context/trips-context";
import { FirebaseClientProvider } from "@/firebase";

export const metadata: Metadata = {
  title: 'Travex | Smart Travel Expenses',
  description: 'Intelligent expense capture and splitting for modern travelers.',
};

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
      </head>
      <body className="font-body antialiased bg-background min-h-screen text-foreground">
        <FirebaseClientProvider>
          <TripsProvider>
            {children}
          </TripsProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
