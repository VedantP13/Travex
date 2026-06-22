'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * The "Hand" mechanism that auto-selects categories.
 * Now includes browser logging for debugging.
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
    if (query.length < 3 || query === lastInput.current) return;

    const timer = setTimeout(async () => {
      setIsAnalyzing(true);
      lastInput.current = query;
      
      console.log(`[Categorization] Analyzing: "${query}"...`);
      
      try {
        const result = await suggestExpenseCategory({ 
          description: query,
          availableCategories: categoriesList
        });
        
        if (result && result.category) {
          console.log(`[Categorization] Success: "${query}" -> "${result.category}" (${result.reasoning})`);
          setFormData(prev => ({ ...prev, category: result.category }));
        }
      } catch (e) {
        console.warn("[Categorization] Communication error with Brain:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 700); // Slight delay for smoother typing

    return () => clearTimeout(timer);
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
