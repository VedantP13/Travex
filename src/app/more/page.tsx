"use client";

import { Compass, Settings, HelpCircle, ShieldCheck, LogOut, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";

const MORE_OPTIONS = [
  { 
    title: "Explore", 
    description: "Discover new travel destinations", 
    icon: Compass, 
    href: "/explore",
    color: "bg-primary/10 text-primary"
  },
  { 
    title: "Settings", 
    description: "App preferences and notifications", 
    icon: Settings, 
    href: "#",
    disabled: true,
    color: "bg-orange-100 text-orange-600"
  },
  { 
    title: "Support", 
    description: "Get help with your expenses", 
    icon: HelpCircle, 
    href: "#",
    disabled: true,
    color: "bg-blue-100 text-blue-600"
  },
  { 
    title: "Privacy", 
    description: "Data and security settings", 
    icon: ShieldCheck, 
    href: "#",
    disabled: true,
    color: "bg-green-100 text-green-600"
  },
];

export default function MorePage() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-8">
        <h1 className="text-3xl font-bold">More</h1>
        <p className="text-muted-foreground">Additional features and settings</p>
      </header>

      <main className="px-safe-pad space-y-4">
        {MORE_OPTIONS.map((option) => (
          <Link 
            key={option.title} 
            href={option.disabled ? "#" : option.href}
            className={option.disabled ? "cursor-not-allowed opacity-60" : ""}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden mb-4">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${option.color}`}>
                    <option.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{option.title}</h3>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                {!option.disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              </CardContent>
            </Card>
          </Link>
        ))}

        <Card className="border-none shadow-sm bg-destructive/5 rounded-2xl overflow-hidden mt-8">
          <CardContent className="p-4 flex items-center gap-4 text-destructive">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sign Out</h3>
              <p className="text-xs opacity-70">Logout from your account</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
