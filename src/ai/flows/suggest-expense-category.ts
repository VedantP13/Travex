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
 * Suggests an expense category with a Hybrid approach:
 * 1. Instant Local Keyword Engine (100% reliable for standard terms)
 * 2. Semantic Intent Bridge (AI Brain)
 * 3. Robust Synonym Matcher
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const query = description.trim().toLowerCase();

  if (query.length < 2) {
    return { category: "Other", reasoning: "Description too short." };
  }

  // 1. INSTANT LOCAL KEYWORD ENGINE
  // This handles the "strength" and "reliability" for obvious terms instantly.
  const localMap: Record<string, string[]> = {
    'Food': ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'cafe', 'restaurant', 'pizza', 'burger', 'bhojan', 'snacks', 'drinks', 'coffee', 'tea', 'starbucks', 'zomato', 'swiggy', 'eat', 'bakery', 'pub', 'bar'],
    'Transport': ['transport', 'taxi', 'cab', 'uber', 'ola', 'auto', 'rickshaw', 'tuk tuk', 'bus', 'train', 'shinkansen', 'flight', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'metro', 'commute', 'ride', 'grab', 'bolt'],
    'Stay': ['stay', 'hotel', 'resort', 'airbnb', 'hostel', 'homestay', 'villa', 'room', 'accommodation', 'checkout', 'booking', 'lodge', 'inn'],
    'Shopping': ['shopping', 'mall', 'market', 'souvenir', 'clothes', 'gift', 'grocery', 'supermarket', 'store', 'shop'],
    'Sightseeing': ['sightseeing', 'ticket', 'entry', 'museum', 'safari', 'tour', 'guide', 'activity', 'park', 'zoo', 'palace', 'monument', 'attraction'],
    'Flights': ['flight', 'airfare', 'indigo', 'vistara', 'airline', 'airport', 'boarding', 'terminal']
  };

  for (const [baseCategory, keywords] of Object.entries(localMap)) {
    if (keywords.some(k => query.includes(k))) {
      // Find the best match in the user's specific trip categories
      const matched = availableCategories.find(c => c.toLowerCase() === baseCategory.toLowerCase());
      if (matched) return { category: matched, reasoning: `Keyword match: ${baseCategory}` };
    }
  }

  // 2. SEMANTIC AI BRAIN
  // For complex or context-heavy terms (e.g., "Safari park donation", "Local village feast")
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are a world-class travel expense analyst. 
      TASK: Map the user's description to the SINGLE MOST LOGICAL category from this list: [${availableCategories.join(', ')}].
      
      BRAIN RULES:
      - INTENT FIRST: If the user says "Lunch at a hotel", the intent is "Food", even if "hotel" is mentioned.
      - CULTURAL SAVVY: Understand "Bhojan" is Food, "Tuk Tuk" is Transport, etc.
      - BE DECISIVE: Pick the best fit. Only return "Other" if there is truly no logical connection.
      - OUTPUT: You MUST return a JSON object with a "category" field.`,
      prompt: `DESCRIPTION: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 } // Keep it strict
    });

    if (output?.category) {
      const aiChoice = output.category.trim();
      
      // Stage A: Exact Case-Insensitive Match
      let matched = availableCategories.find(c => c.toLowerCase() === aiChoice.toLowerCase());
      
      // Stage B: Fuzzy Containment Match
      if (!matched) {
        matched = availableCategories.find(c => 
          aiChoice.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(aiChoice.toLowerCase())
        );
      }
      
      // Stage C: Robust Synonym Bridge for common AI "thoughts"
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
    console.error('[AI Categorization Brain Error]', error.message);
  }

  // 3. FINAL FALLBACK
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "Fallback to default." };
}
