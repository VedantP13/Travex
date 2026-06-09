"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Users, BarChart3, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  // In this prototype, we're linking the central FAB to the active trip's expense page
  const activeTripId = "bali-2024";

  const navItems = [
    { href: "/", icon: Wallet, label: "Wallet" },
    { href: "/friends", icon: Users, label: "Friends" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/more", icon: Menu, label: "More" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex justify-around py-3 px-6 z-50">
      {navItems.map((item, idx) => {
        const isActive = pathname === item.href;
        // Using a solid color (muted-foreground) instead of an opacity modifier to avoid icon path overlap artifacts.
        // muted-foreground is now configured as a clear light grey in globals.css.
        const colorClass = isActive ? "text-primary" : "text-muted-foreground";

        // Place the prominent FAB in the middle
        if (idx === 2) {
          return (
            <div key="fab-container" className="flex items-center">
              <div key="fab" className="relative w-12 h-12">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                  <Link href={`/trips/${activeTripId}/add`}>
                    <Button 
                      size="icon" 
                      className="h-14 w-14 rounded-full shadow-xl shadow-primary/40 bg-accent hover:bg-accent/90 border-4 border-white"
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