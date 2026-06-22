'use server';
/**
 * @fileOverview Rebuilt AI categorization "Brain".
 * Implements a "Local Match First" strategy to ensure exact matches never fail.
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
 * Logic: Exact Local Match -> Semantic AI Match -> Default Fallback.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const trimmedDesc = description.trim().toLowerCase();

  // --- STAGE 1: LOCAL EXACT MATCH ---
  // This ensures that if you type "Food", it selects "Food" even if the AI is offline.
  const localMatch = availableCategories.find(c => c.toLowerCase() === trimmedDesc);
  if (localMatch) {
    return { category: localMatch, reasoning: "Local exact match detected." };
  }

  // --- STAGE 2: AI SEMANTIC MATCH ---
  try {
    const { output } = await ai.generate({
      system: `You are a travel expense classifier. 
      TASK: Pick the BEST category from the PROVIDED LIST for the given description.
      
      RULES:
      1. USE GLOBAL KNOWLEDGE: "Bhojan" = Food, "Tuk Tuk" = Transport, "Safari" = Sightseeing.
      2. BE DECISIVE: Only pick "Other" if there is NO reasonable connection.
      3. EXACT STRING: Return the category EXACTLY as it appears in the list.`,
      prompt: `LIST: ${availableCategories.join(', ')}\nDESCRIPTION: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 } // Strict analytical mode
    });

    if (output?.category) {
      const target = output.category.trim();
      
      // Exact Match from AI
      let matched = availableCategories.find(c => c.toLowerCase() === target.toLowerCase());
      
      // Fuzzy Match from AI (e.g., if AI says "Dining" but list has "Food")
      if (!matched) {
        matched = availableCategories.find(c => {
          const cLow = c.toLowerCase();
          const tLow = target.toLowerCase();
          return cLow.includes(tLow) || tLow.includes(cLow);
        });
      }

      if (matched) {
        return { category: matched, reasoning: output.reasoning };
      }
    }
  } catch (error: any) {
    // This will appear in your SERVER terminal. Check it if you still see "Other".
    console.error('--- AI BRAIN ERROR ---');
    console.error('Message:', error.message);
    console.error('Check your API Key in .env');
    console.error('----------------------');
  }

  // --- STAGE 3: FALLBACK ---
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "Default fallback used." };
}
