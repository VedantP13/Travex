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
  prompt: `You are a world-class multilingual travel expense analyst with advanced cultural knowledge.

YOUR TASK:
Analyze the EXPENSE DESCRIPTION and select the best matching category from the AVAILABLE CATEGORIES list.

BRAIN & REASONING RULES:
1. GLOBAL KNOWLEDGE: Use your full database of global languages, brands, and regional services.
   - Recognize terms in Hindi (e.g., "Bhojan" -> FOOD, "Vahan" -> TRANSPORT), Spanish (e.g., "Manger" -> FOOD), etc.
   - Recognize regional vehicles (e.g., "Tempo Traveller", "Auto Rickshaw", "Tuk Tuk" -> TRANSPORT).
   - Recognize global brands (e.g., "Zomato", "Grab", "Starbucks" -> FOOD; "Uber", "Lyft", "Shell" -> TRANSPORT).
2. SEMANTIC INTENT:
   - "Safari tickets" or "Museum entry" are SIGHTSEEING.
   - "Toll tax" or "Petrol" or "Taxi" are TRANSPORT.
   - "Hostel" or "Airbnb" or "Resort" are STAY.
3. NO INVENTING: You MUST pick from the provided list. Do NOT return a category that isn't in the list.
4. BE DECISIVE: Avoid choosing "Other" if there is any reasonable relationship to another category.

AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: {{{description}}}

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

    const target = result.category.trim().toLowerCase();
    
    // 1. Exact Match
    let matchedCategory = input.availableCategories.find(
      c => c.trim().toLowerCase() === target
    );

    // 2. Semantic/Fuzzy Match
    if (!matchedCategory) {
      matchedCategory = input.availableCategories.find(c => {
        const listCat = c.trim().toLowerCase();
        // Check if one contains the other (e.g., "Food & Drink" contains "Food")
        return target.includes(listCat) || listCat.includes(target);
      });
    }

    // 3. Fallback Map for common synonyms if still no match
    if (!matchedCategory) {
      const synonymMap: Record<string, string> = {
        'dining': 'food',
        'cafe': 'food',
        'restaurant': 'food',
        'meal': 'food',
        'drinks': 'food',
        'taxi': 'transport',
        'fuel': 'transport',
        'gas': 'transport',
        'commute': 'transport',
        'accommodation': 'stay',
        'hotel': 'stay',
        'attractions': 'sightseeing',
        'tours': 'sightseeing',
        'shopping': 'shopping',
        'purchases': 'shopping',
      };

      for (const [synonym, base] of Object.entries(synonymMap)) {
        if (target.includes(synonym)) {
          matchedCategory = input.availableCategories.find(c => c.toLowerCase() === base);
          if (matchedCategory) break;
        }
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

  // Final reliable fallback
  const fallback = input.availableCategories.find(c => c.toLowerCase() === 'other') || input.availableCategories[0] || "Other";
  return { 
    category: fallback,
    reasoning: "System default due to matching failure."
  };
}
