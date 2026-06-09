"use client";

import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings, 
  Search, 
  Filter, 
  ChevronRight, 
  Utensils, 
  Car, 
  ShoppingBag, 
  Home, 
  Plane,
  MoreVertical,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const FEED_ITEMS = [
  {
    id: 1,
    title: "Dinner at La Favela",
    amount: 85.50,
    category: "Dining",
    icon: Utensils,
    paidBy: "Marco",
    date: "Today, 8:30 PM",
    participants: ["Marco", "Sonia", "Leo", "Julie"]
  },
  {
    id: 2,
    title: "Grab to Seminyak",
    amount: 12.00,
    category: "Transport",
    icon: Car,
    paidBy: "Julie",
    date: "Today, 4:15 PM",
    participants: ["Marco", "Julie"]
  },
  {
    id: 3,
    title: "Villa Rent",
    amount: 450.00,
    category: "Rent",
    icon: Home,
    paidBy: "Sonia",
    date: "Yesterday",
    participants: ["Marco", "Sonia", "Leo", "Julie"]
  },
  {
    id: 4,
    title: "Beach Club Entry",
    amount: 60.00,
    category: "Entertainment",
    icon: ShoppingBag,
    paidBy: "Leo",
    date: "Aug 14",
    participants: ["Marco", "Leo"]
  }
];

export default function TripDetails() {
  const router = useRouter();
  const { id } = useParams();

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Dining': return 'bg-orange-100 text-orange-600';
      case 'Transport': return 'bg-blue-100 text-blue-600';
      case 'Rent': return 'bg-purple-100 text-purple-600';
      default: return 'bg-teal-100 text-teal-600';
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white px-safe-pad py-4 border-b flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Summer in Bali</h1>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Quick Summary */}
      <div className="px-safe-pad py-6 bg-background">
        <div className="flex gap-4 items-center mb-6">
          <Avatar className="h-16 w-16 rounded-2xl border-4 border-white shadow-sm">
            <AvatarImage src="https://picsum.photos/seed/trip1/150/150" />
            <AvatarFallback>IB</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">Active Trip</Badge>
              <span className="text-xs text-muted-foreground italic">Aug 12 - 25</span>
            </div>
            <h2 className="text-xl font-bold">Summer in Bali</h2>
            <div className="flex -space-x-2 mt-2">
              {[1, 2, 3, 4].map(i => (
                <Avatar key={i} className="h-6 w-6 border-2 border-white">
                  <AvatarImage src={`https://picsum.photos/seed/user${i}/50/50`} />
                  <AvatarFallback>U{i}</AvatarFallback>
                </Avatar>
              ))}
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center text-[8px] font-bold">+2</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-white/50 p-1 rounded-xl">
            <TabsTrigger value="feed" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Trip Feed</TabsTrigger>
            <TabsTrigger value="balances" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Balances</TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-1 mr-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  className="w-full bg-white rounded-xl py-2 pl-10 pr-4 text-sm border-none shadow-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <Button size="icon" variant="outline" className="rounded-xl h-10 w-10 border-none bg-white shadow-sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {FEED_ITEMS.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-primary/10 transition-colors flex items-center gap-4 group">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${getCategoryColor(item.category)}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">Paid by <span className="font-medium text-foreground">{item.paidBy}</span> • {item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{item.amount.toFixed(2)}</p>
                    <Badge variant="secondary" className="text-[9px] h-4 font-normal mt-1">
                      {item.participants.length} Split
                    </Badge>
                  </div>
                  <MoreVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="balances" className="mt-6 space-y-4">
            <div className="bg-foreground text-background p-6 rounded-2xl mb-6">
              <p className="text-xs opacity-70 mb-1">Current Standing</p>
              <p className="text-2xl font-bold">You owe ₹45.50</p>
              <div className="mt-4 flex gap-2">
                <Button className="bg-accent hover:bg-accent/90 text-foreground font-bold flex-1">Settle Up</Button>
                <Button variant="outline" className="border-white/20 hover:bg-white/10 flex-1">Remind All</Button>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2">Member Breakdown</h4>
            {[
              { name: "Sonia", status: "You owe", amount: 65.00, color: "text-destructive" },
              { name: "Leo", status: "Owes you", amount: 19.50, color: "text-primary" },
              { name: "Julie", status: "Owes you", amount: 45.00, color: "text-primary" },
            ].map((member, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://picsum.photos/seed/user${idx+2}/50/50`} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h5 className="font-bold text-sm">{member.name}</h5>
                    <p className="text-xs text-muted-foreground">{member.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${member.color}`}>₹{member.amount.toFixed(2)}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90 p-0"
          onClick={() => router.push(`/trips/${id}/add`)}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}
