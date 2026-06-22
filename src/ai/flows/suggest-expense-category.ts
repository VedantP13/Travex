'use server';
/**
 * @fileOverview High-intelligence semantic interpretation engine for expense categorization.
 * 
 * - suggestExpenseCategory - Analyzes descriptions and maps them to provided categories.
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
 * Suggests an expense category with deep semantic reasoning.
 * Uses a hybrid approach: Local Keyword Match -> AI Brain -> Synonym Bridge.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const query = description.trim().toLowerCase();

  if (query.length < 2) {
    return { category: "Other", reasoning: "Description too short." };
  }

  // 1. STRENGTH: INSTANT LOCAL KEYWORD ENGINE
  // This ensures 100% reliability for obvious travel terms.
  const localMap: Record<string, string[]> = {
    'Food': ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'cafe', 'restaurant', 'pizza', 'burger', 'bhojan', 'snacks', 'drinks', 'coffee', 'tea', 'starbucks', 'zomato', 'swiggy'],
    'Transport': ['transport', 'taxi', 'cab', 'uber', 'ola', 'auto', 'rickshaw', 'tuk tuk', 'bus', 'train', 'shinkansen', 'flight', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'metro'],
    'Stay': ['stay', 'hotel', 'resort', 'airbnb', 'hostel', 'homestay', 'villa', 'room', 'accommodation', 'checkout', 'booking'],
    'Shopping': ['shopping', 'mall', 'market', 'souvenir', 'clothes', 'gift', 'grocery', 'supermarket'],
    'Sightseeing': ['sightseeing', 'ticket', 'entry', 'museum', 'safari', 'tour', 'guide', 'activity', 'park', 'zoo', 'palace'],
    'Flights': ['flight', 'airfare', 'indigo', 'vistara', 'airline', 'airport', 'boarding']
  };

  for (const [category, keywords] of Object.entries(localMap)) {
    if (keywords.some(k => query.includes(k))) {
      // Find the exact name in the user's availableCategories (handles casing differences)
      const matched = availableCategories.find(c => c.toLowerCase() === category.toLowerCase());
      if (matched) return { category: matched, reasoning: "Instant keyword match." };
    }
  }

  // 2. INTELLIGENCE: AI BRAIN ANALYSIS
  // For complex or cultural terms (e.g., "Temple donation", "Local market barter")
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are an expert travel analyst. Map the description to the MOST LOGICAL category from this list: [${availableCategories.join(', ')}].
      
      RULES:
      - INTENT FIRST: "Late night pizza" is Food. "Shinkansen to Tokyo" is Transport.
      - CULTURAL AWARENESS: Understand regional terms (Bhojan, Tuk Tuk, etc).
      - BE DECISIVE: Only pick "Other" if there is zero logical connection.
      - OUTPUT: You MUST return a JSON object with a "category" field from the provided list.`,
      prompt: `DESCRIPTION: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 }
    });

    if (output?.category) {
      const aiChoice = output.category.trim();
      
      // Stage A: Exact Case-Insensitive Match
      let matched = availableCategories.find(c => c.toLowerCase() === aiChoice.toLowerCase());
      
      // Stage B: Fuzzy/Partial Match
      if (!matched) {
        matched = availableCategories.find(c => 
          aiChoice.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(aiChoice.toLowerCase())
        );
      }
      
      // Stage C: Robust Synonym Bridge
      if (!matched) {
        const synonymMap: Record<string, string> = {
          'dining': 'Food', 'meal': 'Food', 'eats': 'Food', 'cafe': 'Food',
          'taxi': 'Transport', 'commute': 'Transport', 'ride': 'Transport',
          'hotel': 'Stay', 'accommodation': 'Stay', 'lodging': 'Stay',
          'tours': 'Sightseeing', 'attraction': 'Sightseeing', 'entry': 'Sightseeing'
        };
        
        const mappedBase = Object.keys(synonymMap).find(s => aiChoice.toLowerCase().includes(s));
        if (mappedBase) {
          const targetName = synonymMap[mappedBase];
          matched = availableCategories.find(c => c.toLowerCase() === targetName.toLowerCase());
        }
      }

      if (matched) return { category: matched, reasoning: output.reasoning };
    }
  } catch (error: any) {
    console.error('[AI Categorization Error]', error.message);
  }

  // 3. FINAL FALLBACK
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "Fallback selected." };
}
