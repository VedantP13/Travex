'use server';
/**
 * @fileOverview Refined AI categorization "Brain".
 * Implements a "Local Exact -> Synonym Bridge -> AI Reasoning" strategy.
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
 * Robustly matches an AI suggestion to the user's available categories.
 */
function findBestMatch(suggestion: string, categories: string[]): string | null {
  const target = suggestion.trim().toLowerCase();
  
  // 1. Exact Match
  const exact = categories.find(c => c.toLowerCase() === target);
  if (exact) return exact;

  // 2. Simple Synonym/Intent Bridge
  const map: Record<string, string> = {
    'lunch': 'Food',
    'dinner': 'Food',
    'breakfast': 'Food',
    'brunch': 'Food',
    'meal': 'Food',
    'dining': 'Food',
    'restaurant': 'Food',
    'cafe': 'Food',
    'coffee': 'Food',
    'drinks': 'Food',
    'snacks': 'Food',
    'zomato': 'Food',
    'swiggy': 'Food',
    'taxi': 'Transport',
    'cab': 'Transport',
    'uber': 'Transport',
    'ola': 'Transport',
    'rickshaw': 'Transport',
    'auto': 'Transport',
    'fuel': 'Transport',
    'gas': 'Transport',
    'petrol': 'Transport',
    'train': 'Transport',
    'bus': 'Transport',
    'shuttle': 'Transport',
    'flight': 'Flights',
    'airline': 'Flights',
    'airfare': 'Flights',
    'hotel': 'Stay',
    'resort': 'Stay',
    'airbnb': 'Stay',
    'hostel': 'Stay',
    'villa': 'Stay',
    'accommodation': 'Stay',
    'stay': 'Stay',
    'ticket': 'Sightseeing',
    'museum': 'Sightseeing',
    'safari': 'Sightseeing',
    'tour': 'Sightseeing',
    'activity': 'Sightseeing',
    'shopping': 'Shopping',
    'mall': 'Shopping',
    'market': 'Shopping',
    'gift': 'Shopping',
  };

  const bridgeMatch = Object.keys(map).find(k => target.includes(k));
  if (bridgeMatch) {
    const standardName = map[bridgeMatch];
    return categories.find(c => c.toLowerCase() === standardName.toLowerCase()) || null;
  }

  // 3. Containment Match
  const containment = categories.find(c => {
    const cLow = c.toLowerCase();
    return target.includes(cLow) || cLow.includes(target);
  });
  
  return containment || null;
}

export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const trimmedDesc = description.trim().toLowerCase();

  // STAGE 1: LOCAL FAST MATCH
  const localMatch = availableCategories.find(c => c.toLowerCase() === trimmedDesc);
  if (localMatch) {
    return { category: localMatch, reasoning: "Local direct match." };
  }

  // STAGE 2: AI BRAIN MATCH
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are a world-class travel expense analyst.
      TASK: Categorize the provided expense description into ONE of the categories from the provided list.
      
      RULES:
      1. USE INTENT: "Lunch", "Dinner", "Snacks", "Drinks" -> ALWAYS "Food".
      2. USE CONTEXT: "Uber", "Taxi", "Auto", "Fuel" -> ALWAYS "Transport".
      3. BE DECISIVE: Avoid "Other" unless there is absolutely no thematic connection.
      4. CULTURE AWARE: Understand global and regional terms (e.g., "Bhojan" is Food, "Tempo Traveller" is Transport).
      5. PRECISION: Try to return a category exactly as it appears in the list.`,
      prompt: `LIST: ${availableCategories.join(', ')}\n\nEXPENSE: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 }
    });

    if (output?.category) {
      const matched = findBestMatch(output.category, availableCategories);
      if (matched) {
        return { category: matched, reasoning: output.reasoning };
      }
    }
  } catch (error: any) {
    console.error('--- AI CATEGORIZATION ERROR ---', error.message);
  }

  // STAGE 3: FINAL FALLBACK
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "Default fallback used." };
}
