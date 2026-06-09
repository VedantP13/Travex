"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Shield, Bell, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";

export default function ProfilePage() {
  const router = useRouter();

  const settings = [
    { icon: User, label: "Personal Information", value: "Marco Rossi" },
    { icon: Mail, label: "Email Address", value: "marco@travex.app" },
    { icon: Shield, label: "Security", value: "Two-factor enabled" },
    { icon: Bell, label: "Notifications", value: "Push & Email" },
    { icon: CreditCard, label: "Default Currency", value: "Indian Rupee (₹)" },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad py-6 flex items-center bg-white border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Profile</h1>
      </header>

      <main className="px-safe-pad pt-8 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
            <AvatarImage src="https://picsum.photos/seed/user1/200/200" />
            <AvatarFallback>MC</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-2xl font-bold">Marco Rossi</h2>
            <p className="text-muted-foreground text-sm">Member since July 2024</p>
          </div>
          <Button variant="outline" className="rounded-full px-8">Edit Profile</Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Settings</h3>
          <div className="grid gap-3">
            {settings.map((item) => (
              <Card key={item.label} className="border-none shadow-sm bg-white rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{item.label}</p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
