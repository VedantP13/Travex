
'use server';
/**
 * @fileOverview A Genkit flow that analyzes a trip name to suggest high-quality image search hints.
 *
 * - getDestinationHint - Extracts a 1-2 word visual hint for a destination.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DestinationHintInputSchema = z.object({
  tripName: z.string().describe('The name of the trip provided by the user (e.g., "Goa 2024", "Exploring Rome").'),
});

const DestinationHintOutputSchema = z.object({
  hint: z.string().describe('A 1-2 word search keyword that represents the visual essence of the destination.'),
});

export async function getDestinationHint(input: { tripName: string }) {
  return getDestinationHintFlow(input);
}

const getDestinationHintPrompt = ai.definePrompt({
  name: 'getDestinationHintPrompt',
  input: { schema: DestinationHintInputSchema },
  output: { schema: DestinationHintOutputSchema },
  prompt: `You are a travel visualization expert.
Given a trip name, extract the most visually representative geographical location or landmark and return it as a 1 or 2 word search hint.

EXAMPLES:
- "Goa 2024" -> "Goa beach"
- "My trip to the Eiffel Tower" -> "Eiffel Tower"
- "Himalayan trek" -> "Himalayas mountain"
- "Dandeli with family" -> "Dandeli river"
- "Hidden gems of Mumbai" -> "Mumbai city"
- "Tokyo night life" -> "Tokyo city"

TRIP NAME: {{{tripName}}}

Return only the hint in a JSON object.`,
});

const getDestinationHintFlow = ai.defineFlow(
  {
    name: 'getDestinationHintFlow',
    inputSchema: DestinationHintInputSchema,
    outputSchema: DestinationHintOutputSchema,
  },
  async (input) => {
    const { output } = await getDestinationHintPrompt(input);
    if (!output) {
      // Fallback: just return the first word of the trip name
      return { hint: input.tripName.split(' ')[0] };
    }
    return output;
  }
);
