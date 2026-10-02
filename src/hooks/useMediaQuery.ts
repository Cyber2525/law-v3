import { useState, useEffect } from 'react';

export const DESKTOP_MEDIA_QUERY = '(min-width: 525px) and (min-height: 525px)';

export function useMediaQuery(query: string = DESKTOP_MEDIA_QUERY): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const updateMatches = () => {
      setMatches(mediaQueryList.matches);
    };

    updateMatches();

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatches);
    } else {
      // Fallback for older Safari
      // @ts-ignore
      mediaQueryList.addListener(updateMatches);
    }

    // Direct window resize listener for continuous real-time response during viewport resizing
    window.addEventListener('resize', updateMatches);

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updateMatches);
      } else {
        // @ts-ignore
        mediaQueryList.removeListener(updateMatches);
      }
      window.removeEventListener('resize', updateMatches);
    };
  }, [query]);

  return matches;
}
