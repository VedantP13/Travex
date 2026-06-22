'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * The "Hand" mechanism that applies AI thoughts to the UI state.
 * Fixed to allow dynamic updates as the user retypes descriptions.
 */
export function useExpenseAICategorization(
  description: string,
  categoriesList: string[],
  setFormData: (update: (prev: any) => any) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedInput = useRef("");
  const lastAISuggestion = useRef<string | null>(null); // Track AI's last action
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
          console.log(`[AI Hand] Brain suggested "${result.category}" for "${query}"`);
          lastAnalyzedInput.current = query;
          
          setFormData(prev => {
            const currentCategory = prev.category;
            
            // LOGIC: Allow the AI to change the category if:
            // 1. The current category is default ('Other', empty, or null)
            // 2. The current category matches our LAST AI suggestion (meaning the user hasn't manually picked something else)
            const isDefault = !currentCategory || currentCategory === 'Other' || currentCategory === '';
            const wasSetByAI = currentCategory === lastAISuggestion.current;

            if (isDefault || wasSetByAI) {
               lastAISuggestion.current = result.category;
               return { ...prev, category: result.category };
            }
            
            // If the user manually selected something else, we respect their choice and don't overwrite.
            return prev;
          });
        }
      } catch (e) {
        console.warn("[AI Hand] Brain communication failed:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600); // Snappier 600ms debounce

    return () => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
    };
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
