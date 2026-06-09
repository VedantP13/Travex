
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Map, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Wallet, label: "Wallet" },
    { href: "/explore", icon: Map, label: "Explore" },
    { href: "#", icon: Users, label: "Friends", disabled: true },
    { href: "#", icon: null, label: "Profile", isProfile: true, disabled: true },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex justify-around py-3 px-6 z-50">
      {navItems.map((item, idx) => {
        if (idx === 2) { // Add the FAB in the middle
          return (
            <div key="fab" className="relative w-12 h-12">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                <Link href="/trips/new">
                  <Button size="icon" className="h-12 w-12 rounded-full shadow-lg shadow-primary/40 bg-accent hover:bg-accent/90">
                    <Plus className="h-6 w-6" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        }

        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link 
            key={item.label} 
            href={item.disabled ? "#" : item.href} 
            className={cn(
              "flex flex-col items-center transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
              item.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {item.isProfile ? (
              <div className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold",
                isActive ? "border-primary" : "border-muted-foreground"
              )}>M</div>
            ) : (
              Icon && <Icon className="h-6 w-6" />
            )}
            <span className={cn(
              "text-[10px] mt-1",
              isActive ? "font-bold" : "font-medium"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
