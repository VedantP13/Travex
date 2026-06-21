'use server';
/**
 * @fileOverview An AI agent that suggests expense categories based on expense descriptions.
 *
 * - suggestExpenseCategory - A function that suggests an expense category with deep reasoning and fuzzy mapping.
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
 * Implements intelligent semantic mapping and fuzzy matching natively.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      // System instructions explicitly define the global/local intelligence you want
      system: `You are a world-class travel expense analyst with advanced multilingual and cultural intelligence.
      YOUR TASK: Analyze the user's EXPENSE DESCRIPTION and select the absolute best matching category from the AVAILABLE CATEGORIES list.
      
      ### BRAIN & REASONING RULES:
      1. **Global & Local Context**: Use your deep knowledge of global languages, local cuisines, vehicle types, and regional services.
         - If it's a local dish, snack, or drink anywhere in the world (e.g., "Pav Bhaji", "Sushi", "Croissant", "Boba"), map it to "Food".
         - If it's a vehicle, ride service, or fuel (e.g., "Tuk Tuk", "Auto Rickshaw", "Shinkansen", "Uber", "Petrol"), map it to "Transport".
      2. **Semantic Intent**: Focus on the *intent* of the spend. (e.g., "Museum tickets" -> "Sightseeing").
      3. **No Inventing**: You MUST pick a string exactly as it appears in the AVAILABLE CATEGORIES list. Never create a new category.
      4. **Be Decisive**: Only select "Other" if the expense is completely obscure and has absolutely zero relation to the existing categories.`,
      
      // Inject the dynamic variables straight into the prompt string
      prompt: `AVAILABLE CATEGORIES:\n${input.availableCategories.map(c => `- ${c}`).join('\n')}\n\nEXPENSE DESCRIPTION: "${input.description}"`,
      
      output: {
        schema: SuggestExpenseCategoryOutputSchema,
      },
      config: {
        // Critical: Low temperature ensures strict classification rather than creative writing
        temperature: 0.1, 
      }
    });

    if (!output || !output.category) {
      throw new Error('Invalid AI response payload');
    }

    const target = output.category.trim();

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
        reasoning: output.reasoning
      };
    }

  } catch (error: any) {
    // Check your server console for this exact error log if it still fails
    console.error('Categorization Brain Error:', error.message);
  }

  // Final fallback to the list's 'Other' or first item
  const fallback = input.availableCategories.find(c => c.toLowerCase() === 'other') || input.availableCategories[0] || "Other";
  
  return {
    category: fallback,
    reasoning: "System default due to matching failure."
  };
}
