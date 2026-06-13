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

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Stay',
  'Flights',
  'Sightseeing',
  'Other'
];

const SuggestExpenseCategoryInputSchema = z.object({
  description: z.string().describe('The name or description of the expense.'),
});
export type SuggestExpenseCategoryInput = z.infer<typeof SuggestExpenseCategoryInputSchema>;

const SuggestExpenseCategoryOutputSchema = z.object({
  category: z.string().describe('The suggested expense category. Must be one of: Food, Transport, Shopping, Stay, Flights, Sightseeing, Other.'),
});
export type SuggestExpenseCategoryOutput = z.infer<typeof SuggestExpenseCategoryOutputSchema>;

/**
 * Suggests an expense category based on the description.
 * Includes a retry mechanism for transient 503 errors.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const maxRetries = 2;
  let attempt = 0;

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

      // If we've exhausted retries or it's a non-transient error, 
      // we log it and return "Other" instead of throwing
      // to avoid triggering the Next.js error overlay on the client.
      console.warn('AI categorization failed:', errorMessage);
      return { category: "Other" };
    }
  }

  return { category: "Other" };
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an AI assistant that categorizes expenses for a travel app.
Based on the following expense description, suggest the most relevant expense category from the following list:
- Food
- Transport
- Shopping
- Stay
- Flights
- Sightseeing
- Other

Only return a category from the provided list.

Expense Description: {{{description}}}`,
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
