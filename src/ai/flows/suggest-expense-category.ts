'use server';
/**
 * @fileOverview Rebuilt AI categorization "Brain".
 * Implements a "Local First -> AI Semantic -> Robust Bridge" strategy.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestExpenseCategoryInputSchema = z.object({
  description: z.string().describe('The name or description of the expense.'),
  availableCategories: z.array(z.string()).describe('The list of categories to choose from.'),
});

export type SuggestExpenseCategoryInput = z.infer<typeof SuggestExpenseCategoryInputSchema>;

const SuggestExpenseCategoryOutputSchema = z.object({
  category: z.string().describe('The suggested expense category.'),
  reasoning: z.string().optional().describe('Brief reasoning for the categorization.'),
});

export type SuggestExpenseCategoryOutput = z.infer<typeof SuggestExpenseCategoryOutputSchema>;

/**
 * Suggests an expense category. 
 * Logic: Exact Local Match -> Semantic AI Match -> Synonym Bridge -> Default Fallback.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const trimmedDesc = description.trim().toLowerCase();

  // --- STAGE 1: LOCAL EXACT MATCH ---
  // High-speed check for users typing the category name directly.
  const localMatch = availableCategories.find(c => c.toLowerCase() === trimmedDesc);
  if (localMatch) {
    return { category: localMatch, reasoning: "Local exact match detected." };
  }

  // --- STAGE 2: AI SEMANTIC MATCH ---
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are a world-class travel expense analyst with advanced cultural and linguistic intelligence.
      
      TASK: Pick the BEST category from the provided list for the given description.
      
      RULES:
      1. GLOBAL KNOWLEDGE: Use your knowledge of brands, local dishes, and vehicles.
         - "Bhojan", "Pizza", "Lunch", "Zomato" -> Food
         - "Tuk Tuk", "Uber", "Auto", "Fuel", "Tempo Traveller" -> Transport
         - "Resort", "Hotel", "Airbnb" -> Stay
         - "Museum", "Safari", "Tickets" -> Sightseeing
      2. SEMANTIC INTENT: If someone says "Lunch at a hotel", they are likely talking about the MEAL, so pick "Food" over "Stay" unless the amount is huge.
      3. BE DECISIVE: Only pick "Other" if there is absolutely NO connection.
      4. EXACT LIST: Try to return a category exactly as it appears in the list.`,
      prompt: `AVAILABLE CATEGORIES: ${availableCategories.join(', ')}\n\nEXPENSE: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 } // Strict analytical mode
    });

    if (output?.category) {
      const target = output.category.trim();
      
      // A. Try Exact Match from AI
      let matched = availableCategories.find(c => c.toLowerCase() === target.toLowerCase());
      
      // B. Try Fuzzy/Synonym Match from AI
      if (!matched) {
        matched = availableCategories.find(c => {
          const cLow = c.toLowerCase();
          const tLow = target.toLowerCase();
          return cLow.includes(tLow) || tLow.includes(cLow);
        });
      }

      // C. Robust Synonym Bridge (Hardcoded logic for common AI variances)
      if (!matched) {
        const synonymMap: Record<string, string> = {
          'dining': 'Food',
          'meal': 'Food',
          'restaurant': 'Food',
          'cafe': 'Food',
          'taxi': 'Transport',
          'commute': 'Transport',
          'accommodation': 'Stay',
          'hotel': 'Stay',
          'tour': 'Sightseeing',
          'activity': 'Sightseeing'
        };

        const foundSynonymKey = Object.keys(synonymMap).find(k => target.toLowerCase().includes(k));
        if (foundSynonymKey) {
          const standardName = synonymMap[foundSynonymKey];
          matched = availableCategories.find(c => c.toLowerCase() === standardName.toLowerCase());
        }
      }

      if (matched) {
        return { category: matched, reasoning: output.reasoning };
      }
    }
  } catch (error: any) {
    console.error('--- AI BRAIN ERROR ---', error.message);
  }

  // --- STAGE 3: FALLBACK ---
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "Default fallback used." };
}
