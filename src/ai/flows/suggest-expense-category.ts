'use server';
/**
 * @fileOverview An AI agent that suggests expense categories based on expense descriptions.
 *
 * - suggestExpenseCategory - A function that suggests an expense category with deep reasoning and fuzzy matching.
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

const suggestPrompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are a world-class travel expense analyst with advanced multilingual and cultural intelligence.

YOUR TASK:
Analyze the EXPENSE DESCRIPTION and select the best matching category from the AVAILABLE CATEGORIES list provided below.

### BRAIN & REASONING RULES:
1. **Global Knowledge**: Use your full database of global languages, brands, and regional services.
   - **FOOD**: Recognize terms like "Bhojan" (Hindi), "Pav Bhaji", "Thali", "Zomato", "Starbucks", "Manger", "Dinner", "Snacks".
   - **TRANSPORT**: Recognize regional vehicles like "Tempo Traveller", "Auto Rickshaw", "Tuk Tuk", "Uber", "Grab", "Petrol", "Fuel", "Gas", "Toll".
   - **SIGHTSEEING**: Recognize "Safari tickets", "Museum entry", "Tours", "Entry fee", "Guide", "Attraction".
   - **STAY**: Recognize "Airbnb", "Hotel", "Resort", "Hostel", "Lodge", "Booking".
2. **Semantic Intent**: Focus on the *intent* of the spend. If someone buys "Safari tickets," they are doing Sightseeing, not buying a Flight.
3. **No Inventing**: You MUST pick a string exactly as it appears in the AVAILABLE CATEGORIES list.
4. **Be Decisive**: Avoid choosing "Other" if there is any reasonable relationship to another category in the list.

### CONTEXT:
AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: "{{{description}}}"

Output your choice and reasoning in JSON format.`,
});

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
 * Implements intelligent semantic mapping and fuzzy matching.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  try {
    const result = await suggestExpenseCategoryFlow(input);
    
    if (!result || !result.category) {
      throw new Error('Invalid AI response');
    }

    const target = result.category.trim();
    
    // 1. Exact/Precise Match (Case-insensitive)
    let matchedCategory = input.availableCategories.find(
      c => c.trim().toLowerCase() === target.toLowerCase()
    );

    // 2. Semantic/Fuzzy Match (Contains)
    if (!matchedCategory) {
      matchedCategory = input.availableCategories.find(c => {
        const listCat = c.trim().toLowerCase();
        const resCat = target.toLowerCase();
        return resCat.includes(listCat) || listCat.includes(resCat);
      });
    }

    // 3. Robust Mapping for common AI synonyms
    if (!matchedCategory) {
      const mapping: Record<string, string> = {
        'dining': 'Food',
        'meal': 'Food',
        'restaurant': 'Food',
        'cafe': 'Food',
        'drinks': 'Food',
        'taxi': 'Transport',
        'fuel': 'Transport',
        'gas': 'Transport',
        'petrol': 'Transport',
        'commute': 'Transport',
        'cab': 'Transport',
        'accommodation': 'Stay',
        'hotel': 'Stay',
        'resort': 'Stay',
        'stay': 'Stay',
        'attractions': 'Sightseeing',
        'tours': 'Sightseeing',
        'tickets': 'Sightseeing',
        'museum': 'Sightseeing',
        'safari': 'Sightseeing',
        'shopping': 'Shopping',
        'flights': 'Flights',
        'airfare': 'Flights',
      };

      const mappedKey = Object.keys(mapping).find(k => target.toLowerCase().includes(k));
      if (mappedKey) {
        const targetName = mapping[mappedKey];
        matchedCategory = input.availableCategories.find(c => c.toLowerCase() === targetName.toLowerCase());
      }
    }

    if (matchedCategory) {
      return {
        category: matchedCategory,
        reasoning: result.reasoning
      };
    }
  } catch (error: any) {
    console.error('Categorization Brain Error:', error.message);
  }

  // Final fallback to the list's 'Other' or first item
  const fallback = input.availableCategories.find(c => c.toLowerCase() === 'other') || input.availableCategories[0] || "Other";
  return { 
    category: fallback,
    reasoning: "System default due to matching failure."
  };
}
