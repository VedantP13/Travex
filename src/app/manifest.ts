
import { MetadataRoute } from 'next'

/**
 * PWA Manifest file to make the app installable and identify it as a 
 * standalone travel companion.
 * Updated to use the new brand logo asset.
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
        src: '/travex logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/travex logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
