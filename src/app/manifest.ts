
import { MetadataRoute } from 'next'

/**
 * PWA Manifest file to make the app installable and identify it as a 
 * standalone travel companion.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Travex: Smart Travel Expenses',
    short_name: 'Travex',
    description: 'Intelligent expense capture and splitting for modern travelers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2EFE4',
    theme_color: '#0B6E82',
    icons: [
      {
        src: 'https://picsum.photos/seed/travex192/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://picsum.photos/seed/travex512/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
