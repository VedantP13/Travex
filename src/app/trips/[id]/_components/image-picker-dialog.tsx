
'use client';

import { useRef, useState, useEffect } from "react";
import { X, Upload, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

interface ImagePickerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string;
  onSave: (imageData: string) => Promise<void>;
  isUploading: boolean;
}

export function ImagePickerDialog({ isOpen, onOpenChange, currentImage, onSave, isUploading }: ImagePickerDialogProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [stagedCoverImage, setStagedCoverImage] = useState<string>(currentImage || "");

  // Sync staged image when the dialog opens or currentImage changes
  useEffect(() => {
    if (isOpen) {
      setStagedCoverImage(currentImage || "");
    }
  }, [isOpen, currentImage]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setStagedCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const presetImages = PlaceHolderImages.filter(img => img.id.startsWith('trip-'));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-24 bg-foreground relative flex items-center justify-center shrink-0">
          <DialogTitle className="text-xl font-bold text-white relative z-10">Change cover</DialogTitle>
          <DialogDescription className="sr-only">Choose a predefined image or upload your own.</DialogDescription>
          <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {stagedCoverImage && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Current selection</Label>
                <div className="h-36 w-full rounded-2xl overflow-hidden shadow-md border-4 border-white relative">
                  <img src={stagedCoverImage} className="h-full w-full object-cover" alt="Preview" />
                  <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Upload custom</Label>
              <div 
                onClick={() => imageInputRef.current?.click()}
                className="h-28 w-full rounded-2xl border-2 border-dashed border-primary/20 bg-white flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-primary/5 transition-all shadow-sm group"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold">Pick from device</span>
                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="space-y-3 pb-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Preset styles</Label>
              {presetImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                   {presetImages.map((img) => (
                     <div 
                       key={img.id}
                       className={cn(
                         "relative aspect-video rounded-2xl overflow-hidden cursor-pointer group shadow-sm border-2 transition-all",
                         stagedCoverImage === img.imageUrl ? "border-primary scale-[1.02] ring-2 ring-primary/20" : "border-transparent opacity-80 hover:opacity-100"
                       )}
                       onClick={() => setStagedCoverImage(img.imageUrl)}
                     >
                       <img src={img.imageUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" alt={img.description} />
                       {stagedCoverImage === img.imageUrl && (
                         <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-white drop-shadow-md" />
                         </div>
                       )}
                     </div>
                   ))}
                </div>
              ) : (
                <p className="text-xs text-center py-8 text-muted-foreground italic bg-muted/20 rounded-2xl font-medium">
                  Loading preset library...
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-muted/30 border-t flex flex-col gap-2 shrink-0">
          <Button 
            className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => stagedCoverImage && onSave(stagedCoverImage)}
            disabled={isUploading || !stagedCoverImage || stagedCoverImage === currentImage}
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-muted-foreground text-xs hover:bg-muted">Discard changes</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
