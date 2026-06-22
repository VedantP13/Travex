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
 * Optimized for travel-specific vocabulary and regional terms (e.g., "Bhojan", "Tuk Tuk").
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const { description, availableCategories } = input;
  const trimmedDesc = description.trim();

  if (trimmedDesc.length < 3) {
    return { category: "Other", reasoning: "Description too short for analysis." };
  }

  // 1. FAST LOCAL MATCH (Case-insensitive keyword check)
  const localMatch = availableCategories.find(c => c.toLowerCase() === trimmedDesc.toLowerCase());
  if (localMatch) {
    return { category: localMatch, reasoning: "Direct keyword match." };
  }

  // 2. AI BRAIN ANALYSIS (Deep Semantic Reasoning)
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are an expert travel expense analyst with advanced cultural and linguistic intelligence.
      
      TASK: Map the user's expense description to the MOST LOGICAL category from the provided list.
      
      SEMANTIC MAPPING RULES:
      - FOOD: Includes meals (Lunch, Dinner, Breakfast), snacks, drinks, cafes, restaurants, and regional terms like "Bhojan", "Pav Bhaji", "Tiffin".
      - TRANSPORT: Includes taxis, Uber/Ola, auto-rickshaws, Tuk Tuks, buses, trains, fuel, petrol, tolls, parking, and "Tempo Traveller".
      - STAY: Includes hotels, resorts, hostels, Airbnb, homestays, villas, and room charges.
      - SIGHTSEEING: Includes entry tickets, museum fees, safari costs, guided tours, and activities.
      - SHOPPING: Includes malls, markets, souvenirs, gifts, and clothes.
      - FLIGHTS: Includes airfare, airline names (Indigo, Vistara), and airport charges.
      
      CRITICAL INSTRUCTIONS:
      1. You MUST pick exactly one string from this list: ${availableCategories.join(', ')}.
      2. NEVER invent your own category names.
      3. BE DECISIVE: Only use "Other" if the item is completely unidentifiable. "Taxi" MUST be Transport. "Dinner" MUST be Food.
      4. AVOID defaulting to "Other" if any category can reasonably fit the intent.`,
      prompt: `DESCRIPTION TO CATEGORIZE: "${description}"`,
      output: { schema: SuggestExpenseCategoryOutputSchema },
      config: { temperature: 0.1 }
    });

    if (output?.category) {
      const aiChoice = output.category.trim().toLowerCase();
      
      // Stage A: Exact Case-Insensitive Match
      let matched = availableCategories.find(c => c.toLowerCase() === aiChoice);
      
      // Stage B: Fuzzy Containment (handles "Taxi Service" -> "Transport" if category name is in it)
      if (!matched) {
        matched = availableCategories.find(c => 
          aiChoice.includes(c.toLowerCase()) || c.toLowerCase().includes(aiChoice)
        );
      }
      
      // Stage C: Hard Synonym Bridge (Safety net for the Brain's "thoughts")
      if (!matched) {
        const synonymMap: Record<string, string> = {
          'dining': 'Food', 'meal': 'Food', 'restaurant': 'Food', 'cafe': 'Food', 'snacks': 'Food',
          'taxi': 'Transport', 'auto': 'Transport', 'cab': 'Transport', 'fuel': 'Transport', 'commute': 'Transport',
          'hotel': 'Stay', 'accommodation': 'Stay', 'hostel': 'Stay', 'room': 'Stay',
          'tickets': 'Sightseeing', 'tours': 'Sightseeing', 'entry': 'Sightseeing', 'activity': 'Sightseeing'
        };
        
        const foundKey = Object.keys(synonymMap).find(s => aiChoice.includes(s));
        if (foundKey) {
          const targetName = synonymMap[foundKey];
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
  return { category: fallback, reasoning: "AI analysis failed or returned ambiguous result." };
}
