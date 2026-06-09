import Link from "next/link";
import { Plus, Wallet, Map, Users, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

const TRIPS = [
  {
    id: "bali-2024",
    name: "Summer in Bali",
    date: "Aug 12 - Aug 25",
    totalSpent: 1250.00,
    yourBalance: -45.50,
    participants: 4,
    image: PlaceHolderImages.find(img => img.id === "trip-bali")?.imageUrl,
    status: "Active"
  },
  {
    id: "paris-fall",
    name: "Paris Fashion Week",
    date: "Sep 25 - Oct 02",
    totalSpent: 890.20,
    yourBalance: 120.00,
    participants: 2,
    image: PlaceHolderImages.find(img => img.id === "trip-paris")?.imageUrl,
    status: "Upcoming"
  }
];

export default function Home() {
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-24">
      {/* Header */}
      <header className="px-safe-pad pt-8 pb-6 bg-foreground text-background rounded-b-[2rem]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Travex</h1>
            <p className="text-sm opacity-70">Welcome back, Marco</p>
          </div>
          <Avatar className="h-10 w-10 border-2 border-accent">
            <AvatarImage src="https://picsum.photos/seed/user1/100/100" />
            <AvatarFallback>MC</AvatarFallback>
          </Avatar>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/20 backdrop-blur-sm p-4 rounded-2xl border border-primary/30">
            <p className="text-xs opacity-70 mb-1">You Owe</p>
            <p className="text-xl font-bold">$142.00</p>
          </div>
          <div className="bg-accent/20 backdrop-blur-sm p-4 rounded-2xl border border-accent/30">
            <p className="text-xs opacity-70 mb-1">Owed to You</p>
            <p className="text-xl font-bold text-accent">$285.50</p>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="px-safe-pad -mt-6">
        <div className="flex justify-around bg-card p-4 rounded-2xl shadow-lg shadow-black/5">
          <Link href="/trips/new" className="flex flex-col items-center gap-1 group">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">New Trip</span>
          </Link>
          <div className="flex flex-col items-center gap-1 group opacity-50 cursor-not-allowed">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">Friends</span>
          </div>
          <div className="flex flex-col items-center gap-1 group opacity-50 cursor-not-allowed">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">Analytics</span>
          </div>
        </div>
      </section>

      {/* Trips Section */}
      <main className="px-safe-pad pt-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Recent Trips
          </h2>
          <Button variant="link" className="text-primary text-xs p-0">View all</Button>
        </div>

        <div className="grid gap-4">
          {TRIPS.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <div className="h-32 w-full relative">
                  <img 
                    src={trip.image} 
                    alt={trip.name} 
                    className="h-full w-full object-cover"
                    data-ai-hint="trip landscape"
                  />
                  <Badge className="absolute top-3 right-3 bg-white/90 text-foreground border-none backdrop-blur-md">
                    {trip.status}
                  </Badge>
                </div>
                <CardHeader className="p-4 space-y-1">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold">{trip.name}</CardTitle>
                    <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full flex items-center gap-1">
                      <Users className="h-3 w-3" /> {trip.participants}
                    </span>
                  </div>
                  <CardDescription className="text-xs">{trip.date}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 border-t mt-1 pt-3 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Expense</p>
                    <p className="text-sm font-bold">${trip.totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Your Balance</p>
                    <p className={cn(
                      "text-sm font-bold",
                      trip.yourBalance < 0 ? "text-destructive" : "text-primary"
                    )}>
                      {trip.yourBalance < 0 ? "-" : "+"}${Math.abs(trip.yourBalance).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      {/* Bottom Nav Simulation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex justify-around py-3 px-6 z-50">
        <Link href="/" className="text-primary flex flex-col items-center">
          <Wallet className="h-6 w-6" />
          <span className="text-[10px] mt-1 font-bold">Wallet</span>
        </Link>
        <div className="text-muted-foreground flex flex-col items-center opacity-50">
          <Map className="h-6 w-6" />
          <span className="text-[10px] mt-1 font-medium">Explore</span>
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <Link href="/trips/bali-2024/add">
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg shadow-primary/40 bg-accent hover:bg-accent/90">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
        </div>
        <div className="text-muted-foreground flex flex-col items-center opacity-50">
          <Users className="h-6 w-6" />
          <span className="text-[10px] mt-1 font-medium">Friends</span>
        </div>
        <div className="text-muted-foreground flex flex-col items-center opacity-50">
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-[8px] font-bold">M</div>
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </div>
      </nav>
    </div>
  );
}
