
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, BarChart3, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrips } from "@/context/trips-context";

export function BottomNav() {
  const pathname = usePathname();
  const { trips } = useTrips();

  // Dynamically find an active trip or fallback to the most recent one
  const activeTrip = trips.find(t => t.status === "Active") || trips[0];
  const fabLink = activeTrip ? `/trips/${activeTrip.id}/add` : "/trips/new";

  const leftItems = [
    { href: "/", icon: Compass, label: "Trips" },
    { href: "/friends", icon: Users, label: "Friends" },
  ];

  const rightItems = [
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/more", icon: Menu, label: "More" },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    
    return (
      <Link 
        href={item.href} 
        className={cn(
          "flex flex-col items-center justify-center flex-1 transition-all duration-200 py-1",
          isActive ? "text-primary scale-105" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
        <span className={cn(
          "text-[10px] mt-1.5 tracking-tight", 
          isActive ? "font-bold" : "font-medium"
        )}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t h-[84px] flex items-center z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] px-2">
      <div className="flex w-full items-center justify-between h-full relative">
        {/* Left Side Navigation */}
        <div className="flex flex-1 items-center justify-evenly">
          {leftItems.map(item => (
            <NavItem key={item.label} item={item} />
          ))}
        </div>

        {/* Central Action Button (FAB) Container */}
        <div className="w-20 h-full flex flex-col items-center justify-center relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <Link href={fabLink}>
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                <Button 
                  size="icon" 
                  className="h-14 w-14 rounded-full shadow-xl shadow-accent/40 bg-accent hover:bg-accent transition-all duration-300 hover:scale-110 active:scale-95 text-white"
                  title={activeTrip ? "Add expense" : "Create trip"}
                >
                  <Plus className="h-8 w-8" strokeWidth={3} />
                </Button>
              </div>
            </Link>
          </div>
        </div>

        {/* Right Side Navigation */}
        <div className="flex flex-1 items-center justify-evenly">
          {rightItems.map(item => (
            <NavItem key={item.label} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
