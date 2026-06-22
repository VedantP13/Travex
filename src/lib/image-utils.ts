
'use client';

import { PlaceHolderImages } from "@/lib/placeholder-images";

/**
 * Utility to find the best matching image for a trip.
 * Logic:
 * 1. If user explicitly CHOSE an image (data URI or one from curated list), use it.
 * 2. Otherwise, if trip name/hint matches a curated image, use that "smartly".
 * 3. Fallback to the database value (e.g. initial random seed) or a final deterministic Picsum URL.
 */
export const getTripImage = (tripName: string, fallbackImage?: string, imageHint?: string) => {
  // 1. Check for explicit choices or uploads first
  if (fallbackImage) {
    if (fallbackImage.startsWith('data:')) return fallbackImage;
    
    // Check if the current fallbackImage is one of our curated ones
    const isCurated = PlaceHolderImages.some(img => img.imageUrl === fallbackImage);
    if (isCurated) return fallbackImage;
  }

  // 2. Smart match based on name or hint
  const lowerName = tripName.toLowerCase();
  const lowerHint = imageHint?.toLowerCase();

  const smartMatch = PlaceHolderImages.find(img => {
    const hints = img.imageHint.split(' ').map(h => h.toLowerCase());
    const idKeyword = img.id.replace('trip-', '').toLowerCase();
    
    return (
      (lowerHint && hints.includes(lowerHint)) ||
      lowerName.includes(idKeyword) || 
      hints.some(hint => lowerName.includes(hint))
    );
  });

  if (smartMatch) return smartMatch.imageUrl;
  
  // 3. Final fallback
  // If we have a fallbackImage stored in DB, use it as is.
  // If not, generate a deterministic seed based on the trip name.
  return fallbackImage || `https://picsum.photos/seed/${encodeURIComponent(tripName)}/600/400`;
};
