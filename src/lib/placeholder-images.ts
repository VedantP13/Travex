
'use client';

import data from '@/app/lib/placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

/**
 * Curated list of high-quality travel images.
 * This is the central repository for all placeholder image data used in the app.
 */
export const PlaceHolderImages: ImagePlaceholder[] = (data as any).placeholderImages || [];
