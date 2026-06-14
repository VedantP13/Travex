
'use client';

import { PlaceHolderImages } from "@/lib/placeholder-images";

/**
 * Utility to find the best matching image for a trip.
 * Uses a combination of curated matches, custom hints, and fallback logic.
 */
export const getTripImage = (tripName: string, fallbackImage?: string, imageHint?: string) => {
  const lowerName = tripName.toLowerCase();
  
  // 1. If we have a curated placeholder for this specific hint or name, use it
  const match = PlaceHolderImages.find(img => {
    const idKeyword = img.id.replace('trip-', '').toLowerCase();
    const hints = img.imageHint.split(' ').map(h => h.toLowerCase());
    
    return (
      (imageHint && hints.includes(imageHint.toLowerCase())) ||
      lowerName.includes(idKeyword) || 
      hints.some(hint => lowerName.includes(hint))
    );
  });

  if (match) return match.imageUrl;
  
  // 2. If it's a specific custom image URL, use it
  if (fallbackImage && !fallbackImage.includes('seed') && !fallbackImage.includes('picsum')) {
    return fallbackImage;
  }
  
  // 3. Fallback to a seeded picsum image if no specific hint is available
  // This ensures unique (though random) images for unknown destinations
  const seed = imageHint || tripName;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
};
