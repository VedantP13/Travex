
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
});
export type SuggestExpenseCategoryOutput = z.infer<typeof SuggestExpenseCategoryOutputSchema>;

/**
 * Suggests an expense category based on the description and available categories.
 * Includes a retry mechanism for transient 503 errors.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const maxRetries = 2;
  let attempt = 0;

  // Pre-check for exact matches or common keywords to speed up and improve reliability
  const lowerDesc = input.description.toLowerCase();
  
  // Quick keyword map for common travel scenarios
  const keywordMap: Record<string, string> = {
    'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food', 'coffee': 'Food', 'starbucks': 'Food', 'pizza': 'Food', 'restaurant': 'Food', 'cafe': 'Food', 'burger': 'Food',
    'uber': 'Transport', 'taxi': 'Transport', 'gas': 'Transport', 'petrol': 'Transport', 'fuel': 'Transport', 'bus': 'Transport', 'train': 'Transport', 'metro': 'Transport',
    'hotel': 'Stay', 'airbnb': 'Stay', 'hostel': 'Stay', 'resort': 'Stay',
    'flight': 'Flights', 'airline': 'Flights', 'ticket': 'Flights',
    'safari': 'Safari', 'zoo': 'Sightseeing', 'museum': 'Sightseeing', 'tour': 'Sightseeing'
  };

  for (const [kw, cat] of Object.entries(keywordMap)) {
    if (lowerDesc.includes(kw) && input.availableCategories.includes(cat)) {
      return { category: cat };
    }
  }

  // Exact matches
  const directMatch = input.availableCategories.find(cat => lowerDesc.includes(cat.toLowerCase()));
  if (directMatch) {
    return { category: directMatch };
  }

  while (attempt <= maxRetries) {
    try {
      return await suggestExpenseCategoryFlow(input);
    } catch (error: any) {
      const errorMessage = error.message || '';
      const isTransient = errorMessage.includes('503') || 
                          errorMessage.includes('UNAVAILABLE') || 
                          errorMessage.includes('high demand') ||
                          error.status === 503;

      if (isTransient && attempt < maxRetries) {
        attempt++;
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      console.warn('AI categorization failed:', errorMessage);
      return { category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other" };
    }
  }

  return { category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other" };
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an expert expense classifier for a travel app.
Your goal is to look at a transaction description and pick the BEST matching category from a specific list provided by the user.

RULES:
1. You MUST ONLY pick a category from the provided list.
2. Direct Keywords: If a word in the description matches a category name EXACTLY (case-insensitive), you MUST pick that category.
3. Semantic matching Examples:
   - "lunch", "dinner", "pizza", "coffee", "starbucks", "burger", "mcdonalds" -> "Food"
   - "uber", "taxi", "gas", "petrol", "parking", "grab", "bolt", "bus", "train" -> "Transport"
   - "shopping", "mall", "clothes", "zara", "souvenir", "gift" -> "Shopping"
   - "hotel", "hostel", "airbnb", "booking.com", "resort" -> "Stay"
   - "flight", "boarding pass", "indigo", "air asia", "emirates" -> "Flights"
   - "safari", "tour", "museum", "entry ticket", "zoo", "guide" -> "Sightseeing" (unless "Safari" is its own category)
4. If a custom category exists that matches specifically (like "Safari" for a safari description), pick that instead of a generic one.
5. If no clear match exists, default to "Other" if it's in the list.

AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: {{{description}}}

Respond with a JSON object containing the chosen category. The category name must match the casing and spelling in the list exactly.`,
});

const suggestExpenseCategoryFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoryFlow',
    inputSchema: SuggestExpenseCategoryInputSchema,
    outputSchema: SuggestExpenseCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI returned no output');
    }
    return output;
  }
);
