'use client';

import { ArrowLeft, Settings, Pencil, Trash2, Camera, Calendar as CalendarIcon, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getTripImage } from "@/lib/image-utils";
import { getInitials, getAvatarFallbackClasses } from "@/lib/avatar-utils";

interface TripHeaderProps {
  trip: any;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeCover: () => void;
  onResync: () => void;
  onDownloadExcel: () => void;
}

export function TripHeader({ trip, onBack, onEdit, onDelete, onChangeCover, onResync, onDownloadExcel }: TripHeaderProps) {
  return (
    <div className="relative h-[280px] w-full overflow-hidden shrink-0 rounded-b-[2.5rem] shadow-xl shadow-black/10">
      <img 
        src={getTripImage(trip?.name || "", trip?.image, trip?.imageHint)} 
        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" 
        alt={trip?.name}
        data-ai-hint={trip?.imageHint || "travel landscape"}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      
      <div className="absolute top-6 left-safe-pad right-safe-pad flex justify-between items-center z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-2xl h-11 w-11 border border-white/10 shadow-lg transition-all active:scale-95"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-2xl h-11 w-11 border border-white/10 shadow-lg transition-all active:scale-95"
            >
              <Settings className="h-5 w-5" strokeWidth={2.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl min-w-[200px] p-1 shadow-[0_10px_40px_rgba(0,0,0,0.15)] border-none bg-white">
            <DropdownMenuItem 
              className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-primary focus:bg-primary/10 focus:text-primary active:scale-[0.98] transition-all"
              onClick={onEdit}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                <Pencil className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Edit details</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-slate-600 focus:bg-slate-100 active:scale-[0.98] transition-all"
              onClick={onResync}
            >
              <div className="h-8 w-8 rounded-full bg-slate-100 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Sync balances</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-green-600 focus:bg-green-50 active:scale-[0.98] transition-all"
              onClick={onDownloadExcel}
            >
              <div className="h-8 w-8 rounded-full bg-green-50 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Export to Excel</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 mx-3 bg-muted/30" />
            
            <DropdownMenuItem 
              className="group rounded-xl py-2 px-3 flex items-center gap-3 cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground active:scale-[0.98] transition-all"
              onClick={onDelete}
            >
              <div className="h-8 w-8 rounded-full bg-destructive/10 group-focus:bg-white/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Delete trip</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onChangeCover}
        className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-xl h-9 w-9 border border-white/10 shadow-lg z-10 transition-all active:scale-95"
        title="Change cover"
      >
        <Camera className="h-5 w-5" strokeWidth={2.5} />
      </Button>

      <div className="absolute bottom-6 left-safe-pad right-safe-pad space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3">
          <Badge className={cn(
            "backdrop-blur-md text-white/80 border border-white/10 text-[10px] font-medium px-3 py-1 rounded-lg",
            trip?.status === 'Active' ? 'bg-white/10' : trip?.status === 'Completed' ? 'bg-green-500/40' : trip?.status === 'Settled' ? 'bg-white/5 opacity-60' : 'bg-white/5'
          )}>
            {trip?.status || "Active"}
          </Badge>
          <span className={cn(
            "text-[10px] font-semibold flex items-center gap-1.5",
            trip?.date ? "text-white" : "text-white/60"
          )}>
            <CalendarIcon className={cn("h-3 w-3", trip?.date && "stroke-[3px]")} />
            {trip?.date || "Flexible dates"}
          </span>
        </div>
        
        <h1 className="text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-sm">{trip?.name}</h1>
        
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {trip?.participants?.slice(0, 4).map((p: any, idx: number) => (
              <Avatar key={idx} className="h-7 w-7 border-2 border-white shadow-lg shrink-0">
                <AvatarImage src={p.avatar} className="object-cover" />
                <AvatarFallback className={cn("text-[10px] font-bold", getAvatarFallbackClasses(p.name, true))}>
                  {getInitials(p.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-[10px] font-semibold text-white/80">
            {trip?.participants?.length} participants
          </span>
        </div>
      </div>
    </div>
  );
}
