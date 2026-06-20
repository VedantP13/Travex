
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

  // We no longer use a manual keyword map to avoid limiting the AI's reasoning.
  // This allows the model to handle "Bhojan", "Pav Bhaji", "Tempo Traveller", etc., 
  // using its internal general knowledge of languages and cultures.

  while (attempt <= maxRetries) {
    try {
      const { output } = await suggestExpenseCategoryFlow(input);
      if (!output) throw new Error('AI returned no output');
      return output;
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
      return { 
        category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other",
        reasoning: "Fallback due to system error."
      };
    }
  }

  return { 
    category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other",
    reasoning: "Fallback after retries."
  };
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an expert global travel expense classifier with deep knowledge of world languages, cuisines, transport systems, and brands.
Your goal is to analyze a transaction description and pick the BEST matching category from the provided list.

CRITICAL REASONING RULES:
1. Multilingual Support: You understand terms in many languages. (e.g., "Bhojan" in Hindi is Food, "Almuerzo" in Spanish is Food).
2. Cultural Awareness: You recognize local items and regional services. (e.g., "Pav Bhaji" is Food, "Tempo Traveller" is a vehicle for Transport, "Tuk-Tuk" is Transport).
3. Semantic Intent: Focus on the PURPOSE of the spend:
   - TRANSPORT: Anything related to moving places (Uber, Ola, Taxi, Metro, Train, Bus, Gas/Petrol, Parking, Tolls, Vehicle rentals, Tempo Travellers, Vans).
   - FOOD: Meals, drinks, snacks, cafes, delivery apps (Zomato, Swiggy, Starbucks, Bhojan, Restaurant bills).
   - SIGHTSEEING: Activities, tours, entry fees, monuments, and safaris (e.g., "Safari ticket" is SIGHTSEEING, not Flights).
   - STAY: Accommodation (Hotels, Airbnbs, Resorts).
   - FLIGHTS: ONLY for air travel and airline companies.
4. Brand Recognition: Use your knowledge of brands (e.g., "Grab" is Transport, "Hard Rock Cafe" is Food, "Vistara" is Flights).
5. Specificity: If a specific category like "Safari" is in the list and the description matches a safari, use that specific one. Otherwise, use the broader standard categories.

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
