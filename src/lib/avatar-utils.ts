'use client';

/**
 * Utility to handle deterministic avatar visuals.
 */

export function getInitials(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  
  if (parts.length === 1) {
    return trimmed.substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns a deterministic theme color based on the name hash.
 * Returns 'primary' (Teal) or 'accent' (Amber).
 */
export function getAvatarTheme(name: string): 'primary' | 'accent' {
  let hash = 0;
  const str = name || 'guest';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return Math.abs(hash) % 2 === 0 ? 'primary' : 'accent';
}

/**
 * Standard classes for the Avatar Fallback based on the theme.
 * When isOpaque is true (like in stacked headers or tiny cards), we use solid colors 
 * to prevent transparency bleed-through.
 */
export function getAvatarFallbackClasses(name: string, isOpaque: boolean = false) {
  const theme = getAvatarTheme(name);
  
  if (theme === 'primary') {
    return isOpaque 
      ? "bg-primary text-white border-none" 
      : "bg-primary/10 text-primary";
  }
  
  return isOpaque 
    ? "bg-accent text-white border-none" 
    : "bg-accent/10 text-accent";
}
