
"use client";

import { useState } from "react";
import { Search, MapPin, Compass, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";

const DESTINATIONS = [
  { id: "trip-bali", name: "Bali, Indonesia", category: "Tropical", tag: "Most popular" },
  { id: "trip-paris", name: "Paris, France", category: "Culture", tag: "Seasonal" },
  { id: "trip-tokyo", name: "Tokyo, Japan", category: "Urban", tag: "Trending" },
  { id: "trip-rome", name: "Rome, Italy", category: "History", tag: "Must visit" },
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDestinations = DESTINATIONS.filter(dest => 
    dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dest.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background pb-24">
      {/* Search Header */}
      <header className="px-safe-pad pt-8 pb-6 bg-white rounded-b-[2rem] shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search destinations..." 
            className="h-14 pl-12 rounded-2xl bg-muted focus-visible:ring-primary shadow-sm border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="px-safe-pad pt-8 space-y-8">
        {/* Featured Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">
              {searchQuery ? `Results for "${searchQuery}"` : "Trending destinations"}
            </h2>
            {!searchQuery && <span className="text-xs text-primary font-bold">See all</span>}
          </div>

          <div className="grid gap-6">
            {filteredDestinations.length > 0 ? (
              filteredDestinations.map((dest) => {
                const image = PlaceHolderImages.find(img => img.id === dest.id)?.imageUrl;
                return (
                  <Card key={dest.id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all rounded-3xl bg-white">
                    <div className="h-48 relative">
                      <img 
                        src={image} 
                        alt={dest.name} 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <Badge className="absolute top-4 left-4 bg-white/90 text-foreground border-none backdrop-blur-md font-bold text-[10px]">
                        {dest.tag}
                      </Badge>
                    </div>
                    <CardContent className="p-5 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3" />
                          <span className="text-[10px] font-bold tracking-wider">{dest.category}</span>
                        </div>
                        <h3 className="text-lg font-bold">{dest.name}</h3>
                      </div>
                      <Link href="/trips/new">
                        <Button size="icon" variant="secondary" className="rounded-2xl h-12 w-12 bg-primary/10 text-primary hover:bg-primary hover:text-white">
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground italic text-sm">No destinations found matching your search.</p>
              </div>
            )}
          </div>
        </section>

        {/* Categories Section */}
        {!searchQuery && (
          <section className="space-y-4 pb-4">
            <h2 className="text-lg font-bold">Browse by mood</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {["🌴 Island", "⛰️ Mountain", "🗼 City", "🏛️ History", "🍝 Food"].map((mood) => (
                <Badge 
                  key={mood} 
                  variant="outline" 
                  className="whitespace-nowrap px-4 py-2 rounded-xl border-primary/20 bg-white text-sm font-bold cursor-pointer hover:bg-primary/5 transition-colors"
                >
                  {mood}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
