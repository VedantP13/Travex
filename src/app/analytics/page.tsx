"use client";

import { BarChart3, TrendingDown, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Pie, PieChart } from "recharts";

const DATA = [
  { name: "Dining", value: 450, fill: "hsl(var(--primary))" },
  { name: "Stay", value: 850, fill: "hsl(var(--accent))" },
  { name: "Travel", value: 300, fill: "hsl(var(--secondary))" },
  { name: "Other", value: 150, fill: "hsl(var(--muted-foreground))" },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24">
      <header className="px-safe-pad pt-12 pb-8 bg-foreground text-background rounded-b-[2rem]">
        <h1 className="text-3xl font-bold">
          Analytics
        </h1>
        <p className="opacity-70 mt-1">Your spending patterns at a glance</p>
      </header>

      <main className="px-safe-pad pt-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">Spending</span>
              </div>
              <p className="text-xl font-bold">₹2,450</p>
              <p className="text-[10px] text-muted-foreground mt-1">+12% from last month</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">Saving</span>
              </div>
              <p className="text-xl font-bold">₹1,120</p>
              <p className="text-[10px] text-muted-foreground mt-1">Across 3 active trips</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 flex-wrap mt-2">
               {DATA.map((item) => (
                 <div key={item.name} className="flex items-center gap-1">
                   <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                   <span className="text-[10px] font-medium">{item.name}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Recent Insights</h2>
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
            <p className="text-sm font-medium text-foreground">
              You've spent <span className="text-primary font-bold">₹450</span> on Dining this week. That's 15% lower than your average! Good job!
            </p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
