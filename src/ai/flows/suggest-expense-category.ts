'use server';
/**
 * @fileOverview Strong AI categorization "Brain".
 * Implements a high-reliability semantic interpretation engine.
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
 * Optimized for travel-specific vocabulary and regional/cultural terms.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const trimmedDesc = description.trim();

  if (trimmedDesc.length < 3) {
    return { category: "Other", reasoning: "Description too short for analysis." };
  }

  // 1. FAST LOCAL MATCH (Performance first)
  const localMatch = availableCategories.find(c => c.toLowerCase() === trimmedDesc.toLowerCase());
  if (localMatch) {
    return { category: localMatch, reasoning: "Local exact match." };
  }

  // 2. AI BRAIN ANALYSIS (Deep Semantic reasoning)
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are a high-intelligence travel expense analyst with advanced cultural and brand awareness.
      TASK: Map the user's expense description to the MOST LOGICAL category from their provided list.
      
      BRAIN RULES:
      1. SEMANTIC INTENT: Identify the core purpose of the spend.
         - "Lunch", "Pizza", "Bhojan", "Coffee", "Breakfast", "Pub", "Dining" -> Food.
         - "Uber", "Tuk Tuk", "Taxi", "Auto", "Rickshaw", "Petrol", "Toll", "Parking", "Bus", "Train" -> Transport.
         - "Resort", "Hostel", "Villa", "Homestay", "Hotel", "Room" -> Stay.
         - "Safari", "Entry Ticket", "Museum", "Boat Ride", "Activity", "Guide" -> Sightseeing.
         - "Mall", "Market", "Souvenir", "Clothes" -> Shopping.
         - "Flight", "Airfare", "Vistara", "Indigo" -> Flights.
      2. CULTURAL AWARENESS: Correcty map regional terms (Indian terms like Auto, Rickshaw, Bhojan, etc.) and global brands (Zomato, Swiggy, Uber, Airbnb).
      3. DECISIVE CHOICE: You MUST pick exactly ONE string from the provided categories. Do NOT invent new names.
      4. AVOID 'OTHER': Defaulting to 'Other' is a failure of logic. Use it ONLY if the item is truly unidentifiable (e.g., "Misc 123").`,
      prompt: `AVAILABLE CATEGORIES: ${availableCategories.join(', ')}\n\nUSER EXPENSE DESCRIPTION: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 }
    });

    if (output?.category) {
      // Robustly match the AI's "thought" back to the specific category name in our list
      const aiChoice = output.category.trim().toLowerCase();
      
      // Stage A: Exact Case-Insensitive
      let matched = availableCategories.find(c => c.toLowerCase() === aiChoice);
      
      // Stage B: Fuzzy Containment
      if (!matched) {
        matched = availableCategories.find(c => aiChoice.includes(c.toLowerCase()) || c.toLowerCase().includes(aiChoice));
      }
      
      // Stage C: Hard Synonym Map (Safety net for the Brain)
      if (!matched) {
        const synonymMap: Record<string, string> = {
          'dining': 'Food', 'meal': 'Food', 'restaurant': 'Food', 'cafe': 'Food', 'drinks': 'Food',
          'taxi': 'Transport', 'auto': 'Transport', 'cab': 'Transport', 'fuel': 'Transport',
          'hotel': 'Stay', 'accommodation': 'Stay', 'hostel': 'Stay',
          'tickets': 'Sightseeing', 'tours': 'Sightseeing', 'entry': 'Sightseeing'
        };
        const foundSynonym = Object.keys(synonymMap).find(s => aiChoice.includes(s));
        if (foundSynonym) {
          const targetName = synonymMap[foundSynonym];
          matched = availableCategories.find(c => c.toLowerCase() === targetName.toLowerCase());
        }
      }

      if (matched) {
        return { category: matched, reasoning: output.reasoning };
      }
    }
  } catch (error: any) {
    console.error('[AI Categorization Brain Error]', error.message);
  }

  // 3. FINAL FALLBACK
  const fallback = availableCategories.find(c => c.toLowerCase() === 'other') || availableCategories[0] || "Other";
  return { category: fallback, reasoning: "AI analysis failed or returned obscure result." };
}
