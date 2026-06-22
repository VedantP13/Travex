'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * The "Hand" mechanism that applies AI thoughts to the UI state.
 * Fixed to allow dynamic re-categorization while protecting manual user choices.
 */
export function useExpenseAICategorization(
  description: string,
  categoriesList: string[],
  setFormData: (update: (prev: any) => any) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedInput = useRef("");
  const lastAISuggestion = useRef<string | null>(null);
  const analysisTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const query = description.trim();
    
    if (analysisTimer.current) clearTimeout(analysisTimer.current);

    // If description is cleared, reset suggestion memory so AI can start fresh
    if (query === "") {
      lastAnalyzedInput.current = "";
      lastAISuggestion.current = null;
      return;
    }

    // Skip if input is too short or hasn't changed since last analysis
    if (query.length < 2 || query === lastAnalyzedInput.current) return;

    analysisTimer.current = setTimeout(async () => {
      setIsAnalyzing(true);
      
      try {
        const result = await suggestExpenseCategory({ 
          description: query,
          availableCategories: categoriesList
        });
        
        if (result && result.category) {
          console.log(`[AI Hand] Suggested: "${result.category}" for "${query}"`);
          lastAnalyzedInput.current = query;
          
          setFormData(prev => {
            const currentCategory = prev.category;
            
            // LOGIC: Overwrite the category if:
            // 1. It's the first time ('Other' or empty)
            // 2. The CURRENT category is one that WE (the AI) suggested previously
            // This allows dynamic re-typing (e.g. changing "Lunch" to "Taxi") to work reliably.
            const isDefault = !currentCategory || currentCategory === 'Other' || currentCategory === '';
            const wasSetByAI = currentCategory === lastAISuggestion.current;

            if (isDefault || wasSetByAI) {
               lastAISuggestion.current = result.category;
               return { ...prev, category: result.category };
            }
            
            // If the user manually clicked a category (manual override), we respect their choice.
            return prev;
          });
        }
      } catch (e) {
        console.warn("[AI Hand] Failed to categorize:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600); // 600ms debounce for snappy performance

    return () => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
    };
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
