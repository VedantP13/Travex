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

/**
 * Suggests an expense category based on the description and available categories.
 * Utilizes the full cultural and linguistic capabilities of the AI model.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // In Genkit 1.x, calling the flow returns the result directly.
      const result = await suggestExpenseCategoryFlow(input);
      
      if (!result || !result.category) {
        throw new Error('AI returned invalid or empty output');
      }

      // Ensure the returned category is actually in the available list (case-insensitive check)
      const matchedCategory = input.availableCategories.find(
        c => c.toLowerCase() === result.category.toLowerCase()
      );

      if (matchedCategory) {
        return {
          category: matchedCategory,
          reasoning: result.reasoning
        };
      }

      throw new Error(`AI suggested a category not in the list: ${result.category}`);
    } catch (error: any) {
      const errorMessage = error.message || '';
      const isTransient = errorMessage.includes('503') || 
                          errorMessage.includes('UNAVAILABLE') || 
                          errorMessage.includes('high demand') ||
                          error.status === 503;

      if (isTransient && attempt < maxRetries) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      console.warn('AI categorization attempt failed:', errorMessage);
      break;
    }
  }

  // Final Fallback
  return { 
    category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other",
    reasoning: "Fallback due to matching failure or system error."
  };
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an expert global travel expense classifier with deep knowledge of all world languages, cuisines, transport systems, and local brands.
Your goal is to analyze a transaction description and pick the BEST matching category from the provided list.

CRITICAL REASONING RULES:
1. Multilingual Support: You MUST understand terms in any language. 
   - Examples: "Bhojan" (Hindi) is Food. "Almuerzo" (Spanish) is Food. "Khana" (Urdu/Hindi) is Food. "Manger" (French) is Food.
2. Cultural & Regional Intelligence: You recognize local items and regional services instantly.
   - Examples: "Pav Bhaji" or "Biryani" is Food. "Tempo Traveller", "Rickshaw", "Tuk-Tuk", "Auto", or "Toll" is Transport.
3. Semantic Intent: Focus on the PURPOSE of the spend:
   - TRANSPORT: Anything related to moving people (Uber, Ola, Taxi, Metro, Train, Bus, Gas, Parking, Tolls, Vehicle rentals, Vans).
   - FOOD: Meals, drinks, snacks, cafes, delivery apps (Zomato, Swiggy, Starbucks, Bhojan, Restaurant bills, Groceries).
   - SIGHTSEEING: Activities, tours, entry fees, monuments, and safaris (e.g., "Safari ticket" is SIGHTSEEING, not Flights).
   - STAY: Accommodation (Hotels, Airbnbs, Resorts, Hostels, Camping).
   - FLIGHTS: ONLY for air travel and airline companies (Indigo, Emirates, Air India, Vistara).
4. Brand Recognition: Use your knowledge of brands globally (e.g., "Grab" is Transport, "Hard Rock Cafe" is Food).
5. Logic: NEVER default to "Other" if there is a reasonable match in the list. Be decisive.

AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: {{{description}}}

Respond with a JSON object containing the chosen category and a short reasoning. The category name must match the casing and spelling in the list exactly.`,
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
