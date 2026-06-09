'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // Re-throw asynchronously to be caught by the Next.js error overlay
      setTimeout(() => {
        throw error;
      }, 0);
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  return null;
}
