'use client';

import { useRef, useState, useEffect } from "react";
import { X, Upload, Loader2, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ImagePickerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string;
  onSave: (imageData: string) => Promise<void>;
  isUploading: boolean;
}

export function ImagePickerDialog({ isOpen, onOpenChange, currentImage, onSave, isUploading }: ImagePickerDialogProps) {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [stagedCoverImage, setStagedCoverImage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setStagedCoverImage(currentImage || "");
    }
  }, [isOpen, currentImage]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "File Not Supported",
          description: "Please select a valid image file (PNG, JPG, or WEBP)."
        });
        return;
      }

      // Check size (Firestore has limits for base64 strings in documents)
      if (file.size > 800000) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please pick a smaller image or use a preset style."
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setStagedCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const presetImages = PlaceHolderImages.filter(img => img.id.startsWith('trip-') || img.id.startsWith('hero-'));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-40px)] w-full rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-24 bg-foreground relative flex items-center justify-center shrink-0">
          <DialogTitle className="text-xl font-bold text-white relative z-10">Change Cover</DialogTitle>
          <DialogDescription className="sr-only">Choose a predefined image or upload your own.</DialogDescription>
          <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-foreground/40 ml-1">Current Selection</Label>
              <div className="h-40 w-full rounded-2xl overflow-hidden shadow-md border-4 border-white relative bg-muted/20 flex items-center justify-center">
                {stagedCoverImage ? (
                  <>
                    <img src={stagedCoverImage} className="h-full w-full object-cover animate-in fade-in duration-300" alt="Preview" />
                    <div className="absolute top-3 right-3 bg-primary text-white p-1.5 rounded-full shadow-lg">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-[10px] font-bold">No cover selected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-foreground/40 ml-1">Upload Custom</Label>
              <div 
                onClick={() => imageInputRef.current?.click()}
                className="h-24 w-full rounded-2xl border-2 border-dashed border-primary/20 bg-white flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-primary/5 transition-all shadow-sm group"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Upload className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold">Pick from device</span>
                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="space-y-3 pb-6">
              <Label className="text-[10px] font-bold text-foreground/40 ml-1">Preset Styles</Label>
              {presetImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                   {presetImages.map((img) => (
                     <div 
                       key={img.id}
                       className={cn(
                         "relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group shadow-sm border-2 transition-all",
                         stagedCoverImage === img.imageUrl ? "border-primary scale-[1.02] ring-2 ring-primary/20" : "border-transparent opacity-80 hover:opacity-100"
                       )}
                       onClick={() => setStagedCoverImage(img.imageUrl)}
                     >
                       <img src={img.imageUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt={img.description} />
                       {stagedCoverImage === img.imageUrl && (
                         <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                            <Check className="h-8 w-8 text-white drop-shadow-lg" strokeWidth={3} />
                         </div>
                       )}
                     </div>
                   ))}
                </div>
              ) : (
                <div className="h-32 w-full rounded-2xl bg-muted/10 border-2 border-dashed border-muted/20 flex items-center justify-center">
                  <p className="text-[10px] text-muted-foreground font-bold animate-pulse">
                    Loading preset library...
                  </p>
                </div>
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
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Updating...
              </div>
            ) : "Save Changes"}
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-muted-foreground text-xs hover:bg-muted">Discard Changes</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
