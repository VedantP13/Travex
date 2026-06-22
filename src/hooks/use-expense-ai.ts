'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * The "Hand" mechanism that applies AI thoughts to the UI state.
 * Refined for high reliability and stability.
 */
export function useExpenseAICategorization(
  description: string,
  categoriesList: string[],
  setFormData: (update: (prev: any) => any) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedInput = useRef("");
  const analysisTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const query = description.trim();
    
    // Reset timer if user keeps typing
    if (analysisTimer.current) clearTimeout(analysisTimer.current);

    // Skip if input is too short or hasn't changed since last successful analysis
    if (query.length < 3 || query === lastAnalyzedInput.current) return;

    analysisTimer.current = setTimeout(async () => {
      setIsAnalyzing(true);
      
      try {
        const result = await suggestExpenseCategory({ 
          description: query,
          availableCategories: categoriesList
        });
        
        if (result && result.category) {
          console.log(`[AI Hand] Suggestion for "${query}": ${result.category}`);
          lastAnalyzedInput.current = query;
          
          setFormData(prev => {
            // Only auto-update if the user hasn't already picked a non-default category
            // This prevents the AI from fighting the user's manual choice.
            if (prev.category === 'Other' || prev.category === '' || prev.category === undefined) {
               return { ...prev, category: result.category };
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("[AI Hand] Brain communication failed:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 800); // 800ms debounce ensures a "strong" intent signal before calling the AI

    return () => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
    };
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
