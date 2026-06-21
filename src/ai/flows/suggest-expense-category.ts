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
  prompt: `You are an expert global travel expense classifier with advanced cultural and linguistic knowledge.

YOUR TASK:
Analyze the provided EXPENSE DESCRIPTION and select the single most appropriate category from the AVAILABLE CATEGORIES list.

BRAIN & REASONING RULES:
1. WORLD KNOWLEDGE: Use your knowledge of global languages, brands, and regional terms.
   - "Bhojan", "Pav Bhaji", "Zomato", "Dinner", "Lunch" -> FOOD
   - "Tempo Traveller", "Uber", "Grab", "Tuk Tuk", "Auto", "Taxi", "Gas", "Petrol" -> TRANSPORT
   - "Safari", "Museum", "Tickets", "Entry Fee", "Tour Guide" -> SIGHTSEEING
   - "Indigo", "AirIndia", "Emirates", "Flight", "Airport" -> FLIGHTS
   - "Airbnb", "Hotel", "Hostel", "Stay", "Resort" -> STAY
2. LINGUISTIC FLEXIBILITY: Understand terms in Hindi, Spanish, French, etc. (e.g., "Manger" is Food).
3. INTENT OVER KEYWORD: If the description is "Safari ticket", the intent is a tourist activity (SIGHTSEEING), not a transportation ticket (FLIGHTS/TRANSPORT).
4. STRICT VOCABULARY: You MUST choose a category from the provided list. Do NOT invent new categories.

AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: {{{description}}}

Output your choice and reasoning in JSON format.`,
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
  try {
    const result = await suggestExpenseCategoryFlow(input);
    
    if (!result || !result.category) {
      throw new Error('Invalid AI response');
    }

    const target = result.category.trim().toLowerCase();
    
    // 1. Try exact match (case-insensitive)
    let matchedCategory = input.availableCategories.find(
      c => c.trim().toLowerCase() === target
    );

    // 2. Try partial/fuzzy match if no exact match
    if (!matchedCategory) {
      matchedCategory = input.availableCategories.find(
        c => {
          const listCat = c.trim().toLowerCase();
          return target.includes(listCat) || listCat.includes(target);
        }
      );
    }

    if (matchedCategory) {
      return {
        category: matchedCategory,
        reasoning: result.reasoning
      };
    }

    console.warn(`AI suggested "${result.category}" but it didn't match any in:`, input.availableCategories);
  } catch (error: any) {
    console.error('Categorization attempt failed:', error.message);
  }

  // Fallback to "Other" or the first category
  const fallback = input.availableCategories.find(c => c.toLowerCase() === 'other') || input.availableCategories[0] || "Other";
  return { 
    category: fallback,
    reasoning: "System default due to matching failure."
  };
}
