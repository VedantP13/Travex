
'use client';

import { PlaceHolderImages } from "@/lib/placeholder-images";

/**
 * Utility to find the best matching image for a trip based on its name.
 * Scans for keywords in the trip name and maps them to curated high-quality placeholders.
 */
export const getTripImage = (tripName: string, fallbackImage?: string) => {
  const lowerName = tripName.toLowerCase();
  
  // Try to find a match in our placeholder library based on hints or ID
  const match = PlaceHolderImages.find(img => {
    const idKeyword = img.id.replace('trip-', '').toLowerCase();
    const hints = img.imageHint.split(' ').map(h => h.toLowerCase());
    
    return lowerName.includes(idKeyword) || hints.some(hint => lowerName.includes(hint));
  });

  if (match) return match.imageUrl;
  
  // If no match found and we have a specific image already, use it (unless it's a generic seed)
  if (fallbackImage && !fallbackImage.includes('seed')) return fallbackImage;
  
  // Final fallback to a generic travel hero
  return fallbackImage || PlaceHolderImages.find(img => img.id === "hero-travel")?.imageUrl;
};
