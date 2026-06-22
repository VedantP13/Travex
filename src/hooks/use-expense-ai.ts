'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * The "Hand" mechanism that applies AI thoughts to the UI state.
 */
export function useExpenseAICategorization(
  description: string,
  categoriesList: string[],
  setFormData: (update: (prev: any) => any) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastInput = useRef("");

  useEffect(() => {
    const query = description.trim();
    
    // Only analyze if the description is significant and has changed
    if (query.length < 3 || query === lastInput.current) return;

    const timer = setTimeout(async () => {
      setIsAnalyzing(true);
      lastInput.current = query;
      
      console.log(`[AI Brain] Analyzing intent for: "${query}"...`);
      
      try {
        const result = await suggestExpenseCategory({ 
          description: query,
          availableCategories: categoriesList
        });
        
        if (result && result.category) {
          console.log(`[AI Brain] Result: "${query}" -> "${result.category}" (Reason: ${result.reasoning})`);
          
          setFormData(prev => {
            // Only update if the user hasn't manually picked a different non-default category
            // or if the current category is "Other"
            if (prev.category === 'Other' || prev.category === '') {
               return { ...prev, category: result.category };
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("[AI Brain] Failed to communicate with categorization service:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600); // 600ms debounce for snappier feedback

    return () => clearTimeout(timer);
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
