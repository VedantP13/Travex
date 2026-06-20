'use server';
/**
 * @fileOverview An AI agent that suggests expense categories based on expense descriptions.
 *
 * - suggestExpenseCategory - A function that suggests an expense category with retry logic.
 * - SuggestExpenseCategoryInput - The input type for the suggestExpenseCategory function.
 * - SuggestExpenseCategoryOutput - The return type for the suggestExpenseCategory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestExpenseCategoryInputSchema = z.object({
  description: z.string().describe('The name or description of the expense.'),
  availableCategories: z.array(z.string()).describe('The list of categories to choose from.'),
});
export type SuggestExpenseCategoryInput = z.infer<typeof SuggestExpenseCategoryInputSchema>;

const SuggestExpenseCategoryOutputSchema = z.object({
  category: z.string().describe('The suggested expense category from the provided list.'),
  reasoning: z.string().optional().describe('Brief reasoning for the categorization.'),
});
export type SuggestExpenseCategoryOutput = z.infer<typeof SuggestExpenseCategoryOutputSchema>;

// 1. Define Prompt First
const suggestPrompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an expert global travel expense classifier. 
Your goal is to analyze a transaction description and pick the BEST matching category from the provided list.

REASONING RULES:
1. Multilingual: Understand terms in any language (e.g., "Bhojan" is Food, "Manger" is Food, "Almuerzo" is Food).
2. Regional Items: Recognize local items (e.g., "Pav Bhaji" is Food, "Tuk Tuk" or "Tempo Traveller" is Transport).
3. Intent: Focus on the PURPOSE (e.g., "Safari ticket" is Sightseeing, not Flights).
4. Brands: Recognize brands (e.g., "Grab" is Transport, "Uber" is Transport, "Zomato" is Food).

AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: {{{description}}}

IMPORTANT: You MUST return a JSON object. The category name should ideally match one from the list exactly. Avoid "Other" if any other category is even remotely applicable.`,
});

// 2. Define Flow
const suggestExpenseCategoryFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoryFlow',
    inputSchema: SuggestExpenseCategoryInputSchema,
    outputSchema: SuggestExpenseCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await suggestPrompt(input);
    if (!output) {
      throw new Error('AI returned no output');
    }
    return output;
  }
);

/**
 * Suggests an expense category based on the description and available categories.
 * This is the primary entry point called by the UI.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await suggestExpenseCategoryFlow(input);
      
      if (!result || !result.category) {
        throw new Error('Invalid AI response');
      }

      // Robust matching logic: trim and case-insensitive
      const target = result.category.trim().toLowerCase();
      const matchedCategory = input.availableCategories.find(
        c => c.trim().toLowerCase() === target
      );

      if (matchedCategory) {
        return {
          category: matchedCategory,
          reasoning: result.reasoning
        };
      }

      // If no exact match, try partial match or just return the AI's first pick if it seems valid
      console.warn(`AI suggested "${result.category}" which wasn't in list:`, input.availableCategories);
      break;
    } catch (error: any) {
      console.error('Categorization attempt failed:', error.message);
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  // Final Fallback: Return "Other" if it exists, else the first category
  const fallback = input.availableCategories.find(c => c.toLowerCase() === 'other') || input.availableCategories[0] || "Other";
  return { 
    category: fallback,
    reasoning: "System default due to matching failure."
  };
}
