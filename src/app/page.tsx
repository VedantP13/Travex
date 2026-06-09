import Link from "next/link";
import { Plus, Map, Users, TrendingUp, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/bottom-nav";

const TRIPS = [
  {
    id: "bali-2024",
    name: "Summer in Bali",
    date: "Aug 12 - Aug 25",
    totalSpent: 1250.00,
    yourBalance: -45.50,
    participants: 4,
    image: (PlaceHolderImages || []).find(img => img.id === "trip-bali")?.imageUrl,
    status: "Active"
  },
  {
    id: "paris-fall",
    name: "Paris Fashion Week",
    date: "Sep 25 - Oct 02",
    totalSpent: 890.20,
    yourBalance: 120.00,
    participants: 2,
    image: (PlaceHolderImages || []).find(img => img.id === "trip-paris")?.imageUrl,
    status: "Upcoming"
  }
];

export default function Home() {
  const activeTrip = TRIPS.find(t => t.status === "Active") || TRIPS[0];

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-24">
      {/* Header */}
      <header className="px-safe-pad pt-8 pb-10 bg-foreground text-background rounded-b-[2.5rem] shadow-2xl shadow-black/10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Zap className="h-6 w-6 text-foreground fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-background">Travex</h1>
              <p className="text-sm opacity-70 text-background">Welcome back, Marco</p>
            </div>
          </div>
          <Link href="/profile">
            <Avatar className="h-10 w-10 border-2 border-accent hover:scale-105 transition-transform shadow-lg shadow-black/20">
              <AvatarImage src="https://picsum.photos/seed/user1/100/100" />
              <AvatarFallback>MC</AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
            <p className="text-[10px] font-bold opacity-60 mb-2">You owe</p>
            <p className="text-2xl font-bold">₹142.00</p>
          </div>
          <div className="bg-accent/10 backdrop-blur-md p-5 rounded-3xl border border-accent/20">
            <p className="text-[10px] font-bold text-accent mb-2">Owed to you</p>
            <p className="text-2xl font-bold text-accent">₹285.50</p>
          </div>
        </div>
      </header>

      {/* Dynamic Trip Spotlight */}
      <section className="px-safe-pad -mt-8">
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-9 border-2 border-white/20 shadow-xl bg-primary text-primary-foreground rounded-3xl p-5 flex flex-col justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[9px] font-bold opacity-80">Ongoing: {activeTrip.name}</span>
              </div>
              <p className="text-xl font-bold">₹{activeTrip.totalSpent.toFixed(2)} spent</p>
              <p className="text-[10px] opacity-60 mt-1 font-semibold">{activeTrip.participants} friends splitting</p>
            </div>
            <Link 
              href={`/trips/${activeTrip.id}/add`} 
              className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:opacity-80 transition-opacity"
            >
              Add expense <ChevronRight className="h-3 w-3" />
            </Link>
          </Card>
          
          <Link 
            href="/trips/new" 
            className="col-span-3 bg-white shadow-xl rounded-3xl flex flex-col items-center justify-center gap-2 group hover:bg-muted/50 transition-colors border-2 border-accent/20"
          >
            <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[8px] font-extrabold text-muted-foreground text-center px-1">New trip</span>
          </Link>
        </div>
      </section>

      {/* Recent Trips Section */}
      <main className="px-safe-pad pt-10 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Trip collections
          </h2>
          <Button variant="link" className="text-primary text-xs font-bold p-0">See all</Button>
        </div>

        <div className="grid gap-5">
          {TRIPS.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl">
                <div className="h-32 w-full relative">
                  <img 
                    src={trip.image} 
                    alt={trip.name} 
                    className="h-full w-full object-cover"
                    data-ai-hint="trip landscape"
                  />
                  <Badge className="absolute top-4 right-4 bg-white/90 text-foreground border-none backdrop-blur-md font-bold text-[10px]">
                    {trip.status}
                  </Badge>
                </div>
                <CardHeader className="p-5 space-y-1">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold">{trip.name}</CardTitle>
                    <span className="text-[10px] font-bold px-3 py-1 bg-muted rounded-full flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> {trip.participants}
                    </span>
                  </div>
                  <CardDescription className="text-xs font-medium text-muted-foreground">{trip.date}</CardDescription>
                </CardHeader>
                <div className="px-5 pb-5 pt-0 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">Total</p>
                    <p className="text-sm font-bold">₹{trip.totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">Balance</p>
                    <p className={cn(
                      "text-sm font-bold",
                      trip.yourBalance < 0 ? "text-destructive" : "text-primary"
                    )}>
                      {trip.yourBalance < 0 ? "-" : "+"}₹{Math.abs(trip.yourBalance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
