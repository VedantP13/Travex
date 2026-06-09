
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, BarChart3, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  // In this prototype, we use a fallback active trip ID for the global FAB if none is selected
  const activeTripId = "bali-2024";

  const navItems = [
    { href: "/", icon: Compass, label: "Trips" },
    { href: "/friends", icon: Users, label: "Friends" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/more", icon: Menu, label: "More" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex justify-around py-3 px-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item, idx) => {
        const isActive = pathname === item.href;
        const colorClass = isActive ? "text-primary" : "text-slate-400";

        // Place the prominent FAB in the middle
        if (idx === 2) {
          return (
            <div key="fab-container" className="flex items-center">
              <div key="fab" className="relative w-12 h-12">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                  <Link href={`/trips/${activeTripId}/add`}>
                    <Button 
                      size="icon" 
                      className="h-14 w-14 rounded-full shadow-xl shadow-primary/40 bg-accent hover:bg-primary hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 border-4 border-white text-foreground"
                      title="Add expense"
                    >
                      <Plus className="h-7 w-7" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Link 
                  href={item.href} 
                  className={cn(
                    "flex flex-col items-center transition-colors ml-4",
                    colorClass
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className={cn("text-[10px] mt-1", isActive ? "font-bold" : "font-medium")}>
                    {item.label}
                  </span>
                </Link>
              </div>
            </div>
          );
        }

        return (
          <Link 
            key={item.label} 
            href={item.href} 
            className={cn(
              "flex flex-col items-center transition-colors",
              colorClass
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className={cn("text-[10px] mt-1", isActive ? "font-bold" : "font-medium")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
