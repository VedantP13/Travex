
'use client';

import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DeleteTripDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
  onDelete: () => void;
  isDeleting: boolean;
}

export function DeleteTripDialog({ isOpen, onOpenChange, tripName, onDelete, isDeleting }: DeleteTripDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-52 bg-destructive/10 relative flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
             <AlertTriangle className="h-10 w-10 text-destructive animate-pulse" />
          </div>
        </div>
        <div className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Delete trip?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold leading-relaxed text-muted-foreground px-4">
              This will permanently remove <span className="text-destructive font-bold">{tripName}</span> and all associated expenses. This action cannot be undone.
            </AlertDialogDescription>
          </div>
          <div className="space-y-3 pt-4">
            <Button 
              variant="destructive"
              className="w-full h-14 rounded-2xl font-bold text-base gap-3 shadow-lg shadow-destructive/20 transition-all active:scale-95"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete permanently
            </Button>
            <Button 
              variant="ghost"
              className="w-full h-12 rounded-2xl font-bold text-foreground hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              Keep trip
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
