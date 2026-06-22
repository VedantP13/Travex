'use server';
/**
 * @fileOverview Strong AI categorization "Brain".
 * Implements a high-reliability "Semantic Reasoning" engine.
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

  // 2. Intelligent Mapping for common travel intents
  // This maps AI "Thoughts" to likely Category "Titles" in the user's list
  const intentMap: Record<string, string[]> = {
    'Food': ['lunch', 'dinner', 'breakfast', 'brunch', 'meal', 'dining', 'restaurant', 'cafe', 'coffee', 'drinks', 'snacks', 'zomato', 'swiggy', 'pizza', 'burger', 'bhojan'],
    'Transport': ['taxi', 'cab', 'uber', 'ola', 'rickshaw', 'auto', 'fuel', 'gas', 'petrol', 'train', 'bus', 'shuttle', 'commute', 'toll', 'parking', 'tempo'],
    'Stay': ['hotel', 'resort', 'airbnb', 'hostel', 'villa', 'accommodation', 'stay', 'room', 'homestay'],
    'Flights': ['airline', 'airfare', 'flight', 'indigo', 'vistara', 'airport'],
    'Sightseeing': ['ticket', 'museum', 'safari', 'tour', 'activity', 'entry', 'monument', 'guide'],
    'Shopping': ['mall', 'market', 'gift', 'souvenir', 'clothes', 'electronics'],
  };

  // Check if the suggestion (or target list item) matches any of these intents
  for (const [canonical, keywords] of Object.entries(intentMap)) {
    const isTargetCanonical = categories.find(c => c.toLowerCase() === canonical.toLowerCase());
    if (isTargetCanonical) {
      if (target === canonical.toLowerCase() || keywords.some(k => target.includes(k))) {
        return isTargetCanonical;
      }
    }
  }

  // 3. Containment Match (Fuzzy)
  const containment = categories.find(c => {
    const cLow = c.toLowerCase();
    return target.includes(cLow) || cLow.includes(target);
  });
  
  return containment || null;
}

/**
 * Direct AI call for maximum reliability in Next.js Server Actions.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const trimmedDesc = description.trim();

  if (trimmedDesc.length < 2) {
    return { category: "Other", reasoning: "Description too short." };
  }

  // STAGE 1: LOCAL FAST MATCH
  const localMatch = availableCategories.find(c => c.toLowerCase() === trimmedDesc.toLowerCase());
  if (localMatch) {
    return { category: localMatch, reasoning: "Local exact match." };
  }

  // STAGE 2: AI BRAIN ANALYSIS
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are a world-class travel expense analyst.
      TASK: Categorize the expense into ONE category from the user's specific list.
      
      BRAIN RULES:
      1. ANALYZE INTENT: "Lunch", "Pizza", "Bhojan" -> Food. "Uber", "Petrol", "Tempo" -> Transport. "Resort", "Hotel" -> Stay.
      2. BE DECISIVE: Avoid "Other" if there is any thematic link (e.g., "Safari" is Sightseeing).
      3. CULTURE AWARE: Understand global brands and regional terms.
      4. STRICT OUTPUT: You must choose from the provided list.`,
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
    console.error('[AI Brain Error]', error.message);
  }

  // STAGE 3: FINAL FALLBACK
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "Matching failed, using default." };
}
