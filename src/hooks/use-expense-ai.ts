'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * The "Hand" mechanism that applies AI logic to the UI state.
 * Fixed to be extremely responsive, re-checking as the user types 
 * and allowing dynamic category changes.
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
    
    // Clear previous pending analysis immediately when user types
    if (analysisTimer.current) clearTimeout(analysisTimer.current);

    // Reset memory if description is cleared
    if (query === "") {
      lastAnalyzedInput.current = "";
      lastAISuggestion.current = null;
      return;
    }

    // Skip if input hasn't changed or is too short
    if (query.length < 2 || query === lastAnalyzedInput.current) return;

    // Use a snappier debounce (400ms) to feel more "alive" and responsive
    analysisTimer.current = setTimeout(async () => {
      setIsAnalyzing(true);
      
      try {
        const result = await suggestExpenseCategory({ 
          description: query,
          availableCategories: categoriesList
        });
        
        if (result && result.category) {
          console.log(`[AI Hand] Input: "${query}" -> Category: "${result.category}"`);
          lastAnalyzedInput.current = query;
          
          setFormData(prev => {
            const currentCategory = prev.category;
            
            // LOGIC: Overwrite the category if:
            // 1. It's currently a default ('Other' or empty)
            // 2. The CURRENT category was the one WE (the AI) suggested previously
            // This allows the category to change from "Food" to "Transport" as the user retypes.
            const isDefault = !currentCategory || currentCategory === 'Other' || currentCategory === '';
            const wasSetByAI = currentCategory === lastAISuggestion.current;

            if (isDefault || wasSetByAI) {
               lastAISuggestion.current = result.category;
               return { ...prev, category: result.category };
            }
            
            // If the user manually clicked a different category card, we stop overriding.
            return prev;
          });
        }
      } catch (e) {
        console.warn("[AI Hand] Brain failed to respond:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 400); 

    return () => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
    };
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
