import { useState, useEffect, useCallback } from 'react';

export function useDraftState<T>(key: string, initialValue: T, expirationMs?: number) {
  const namespacedKey = `draft_${key}`;
  
  // State Initialization
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.sessionStorage.getItem(namespacedKey);
      if (item) {
        const parsed = JSON.parse(item);
        if (expirationMs && parsed.timestamp) {
           if (Date.now() - parsed.timestamp > expirationMs) {
              window.sessionStorage.removeItem(namespacedKey);
              return initialValue;
           }
        }
        return parsed.value;
      }
    } catch (e) {
      console.warn("Failed to parse draft state", e);
    }
    return initialValue;
  });

  // Automatic Persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
         const data = {
            value: state,
            timestamp: Date.now()
         };
         window.sessionStorage.setItem(namespacedKey, JSON.stringify(data));
      } catch (e) {
         console.warn("Failed to save draft state", e);
      }
    }
  }, [state, namespacedKey]);

  // Manual Clear
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
       window.sessionStorage.removeItem(namespacedKey);
    }
    setState(initialValue);
  }, [initialValue, namespacedKey]);

  return [state, setState, clearDraft] as const;
}
