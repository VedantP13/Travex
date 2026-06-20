
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
});
export type SuggestExpenseCategoryOutput = z.infer<typeof SuggestExpenseCategoryOutputSchema>;

/**
 * Suggests an expense category based on the description and available categories.
 * Includes a retry mechanism for transient 503 errors.
 */
export async function suggestExpenseCategory(input: SuggestExpenseCategoryInput): Promise<SuggestExpenseCategoryOutput> {
  const maxRetries = 2;
  let attempt = 0;

  // Pre-check for exact matches or common keywords to speed up and improve reliability
  const lowerDesc = input.description.toLowerCase();
  
  // Quick keyword map for common travel scenarios - expanded for better accuracy
  const keywordMap: Record<string, string> = {
    // Food
    'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food', 'coffee': 'Food', 'starbucks': 'Food', 'pizza': 'Food', 'restaurant': 'Food', 'cafe': 'Food', 'burger': 'Food', 'mcdonalds': 'Food', 'kfc': 'Food', 'zomato': 'Food', 'swiggy': 'Food',
    // Transport
    'uber': 'Transport', 'taxi': 'Transport', 'gas': 'Transport', 'petrol': 'Transport', 'fuel': 'Transport', 'bus': 'Transport', 'train': 'Transport', 'metro': 'Transport', 'tempo': 'Transport', 'traveller': 'Transport', 'van': 'Transport', 'ola': 'Transport', 'auto': 'Transport', 'toll': 'Transport', 'parking': 'Transport', 'rental': 'Transport',
    // Stay
    'hotel': 'Stay', 'airbnb': 'Stay', 'hostel': 'Stay', 'resort': 'Stay', 'homestay': 'Stay', 'lodge': 'Stay', 'booking.com': 'Stay',
    // Flights
    'flight': 'Flights', 'airline': 'Flights', 'indigo': 'Flights', 'spicejet': 'Flights', 'airasia': 'Flights', 'vistara': 'Flights', 'emirates': 'Flights', 'boarding': 'Flights',
    // Sightseeing
    'safari': 'Sightseeing', 'zoo': 'Sightseeing', 'museum': 'Sightseeing', 'tour': 'Sightseeing', 'entry': 'Sightseeing', 'monument': 'Sightseeing', 'guide': 'Sightseeing', 'aquarium': 'Sightseeing', 'palace': 'Sightseeing'
  };

  // Check keyword map
  for (const [kw, cat] of Object.entries(keywordMap)) {
    if (lowerDesc.includes(kw) && input.availableCategories.includes(cat)) {
      // Specialized check for "ticket": don't auto-map to Flights if it contains sightseeing terms
      if (kw === 'ticket' && (lowerDesc.includes('safari') || lowerDesc.includes('zoo') || lowerDesc.includes('museum'))) {
        continue; 
      }
      return { category: cat };
    }
  }

  // Exact matches
  const directMatch = input.availableCategories.find(cat => lowerDesc.includes(cat.toLowerCase()));
  if (directMatch) {
    return { category: directMatch };
  }

  while (attempt <= maxRetries) {
    try {
      return await suggestExpenseCategoryFlow(input);
    } catch (error: any) {
      const errorMessage = error.message || '';
      const isTransient = errorMessage.includes('503') || 
                          errorMessage.includes('UNAVAILABLE') || 
                          errorMessage.includes('high demand') ||
                          error.status === 503;

      if (isTransient && attempt < maxRetries) {
        attempt++;
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      console.warn('AI categorization failed:', errorMessage);
      return { category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other" };
    }
  }

  return { category: input.availableCategories.includes("Other") ? "Other" : input.availableCategories[0] || "Other" };
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an expert travel expense classifier with deep general knowledge of global and local travel services.
Your goal is to analyze a transaction description and pick the BEST matching category from the provided list.

CRITICAL REASONING RULES:
1. Intent over Keyword: Look at the whole description. 
   - "Safari ticket" or "Museum entry" is SIGHTSEEING, not "Flights" or "Other".
   - "Tempo Traveller" or "Van hire" is TRANSPORT, as these are vehicles.
   - "Airport taxi" is TRANSPORT, not "Flights".
2. Semantic Matching:
   - "Transport": Covers anything related to moving between places (Uber, Ola, Taxi, Metro, Bus, Train, Gas/Petrol, Parking, Tolls, Vehicle rentals, Tempo Travellers, Vans).
   - "Food": Covers meals, drinks, snacks, cafes, and delivery apps (Zomato, Swiggy, Starbucks).
   - "Sightseeing": Covers activities, tours, entry fees, monuments, and safaris.
   - "Stay": Covers accommodation (Hotels, Airbnbs, Resorts).
   - "Flights": ONLY for air travel and airline companies.
3. Brand Recognition: Use your knowledge of brands (e.g., "Vistara" is Flights, "Hard Rock Cafe" is Food, "Grab" is Transport).
4. If a specific category like "Safari" is in the list and the description mentions a safari, use that specific one.
5. If no clear match exists, default to "Other" if it's in the list.

AVAILABLE CATEGORIES:
{{#each availableCategories}}
- {{{this}}}
{{/each}}

EXPENSE DESCRIPTION: {{{description}}}

Respond with a JSON object containing the chosen category. The category name must match the casing and spelling in the list exactly.`,
});

const suggestExpenseCategoryFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoryFlow',
    inputSchema: SuggestExpenseCategoryInputSchema,
    outputSchema: SuggestExpenseCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI returned no output');
    }
    return output;
  }
);
