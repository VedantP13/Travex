'use client';

import { useState, useEffect, useRef } from "react";
import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";

/**
 * Custom hook to handle AI-powered expense categorization.
 * Encapsulates the "Brain" and "Hand" synchronization logic.
 * 
 * @param description - Current expense description.
 * @param categoriesList - List of available categories to map to.
 * @param setFormData - State setter to update the category in the form.
 * @returns { isAnalyzing: boolean } - Loading state for the AI analysis.
 */
export function useExpenseAICategorization(
  description: string,
  categoriesList: string[],
  setFormData: (update: (prev: any) => any) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedInput = useRef({ description: "", categoriesCount: 0 });

  useEffect(() => {
    const trimmedDesc = description.trim();
    const categoriesCount = categoriesList.length;
    
    // Safety check for skipping analysis: min 3 chars and must have categories to map to
    if (trimmedDesc.length < 3 || categoriesCount === 0) return;
    
    // Prevent duplicate analysis for the same input state
    if (
      trimmedDesc === lastAnalyzedInput.current.description && 
      categoriesCount === lastAnalyzedInput.current.categoriesCount
    ) return;

    const timer = setTimeout(async () => {
      setIsAnalyzing(true);
      lastAnalyzedInput.current = { description: trimmedDesc, categoriesCount };
      
      try {
        const result = await suggestExpenseCategory({ 
          description: trimmedDesc,
          availableCategories: categoriesList
        });
        
        if (result && result.category) {
          console.log(`AI categorization success: "${trimmedDesc}" -> "${result.category}"`);
          setFormData(prev => ({ ...prev, category: result.category }));
        }
      } catch (e) {
        console.warn("AI categorization failed:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [description, categoriesList, setFormData]);

  return { isAnalyzing };
}
