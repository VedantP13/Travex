'use server';
/**
 * @fileOverview A Genkit flow for improving automated expense category mappings.
 *
 * - automateCategoryMappingImprovement - A function that takes expense data and user feedback to suggest improved category mapping rules.
 * - AutomateCategoryMappingImprovementInput - The input type for the automateCategoryMappingImprovement function.
 * - AutomateCategoryMappingImprovementOutput - The return type for the automateCategoryMappingImprovement function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AutomateCategoryMappingImprovementInputSchema = z.object({
  expenseDescription: z
    .string()
    .describe('The detailed description of the expense transaction.'),
  userAssignedCategory: z
    .string()
    .describe('The category explicitly assigned by the user.'),
  predictedCategory: z
    .string()
    .optional()
    .describe(
      'The category previously predicted by the system, if any, before user correction.'
    ),
  currentCategoryMappingExamples: z
    .string()
    .optional()
    .describe(
      'A textual representation of existing category mapping rules or examples that the system uses for learning.'
    ),
});

export type AutomateCategoryMappingImprovementInput = z.infer<
  typeof AutomateCategoryMappingImprovementInputSchema
>;

const AutomateCategoryMappingImprovementOutputSchema = z.object({
  suggestedNewMappingRule: z
    .string()
    .describe(
      'A recommended new or improved category mapping rule in a descriptive format (e.g., "If description contains X, map to Y").'
    ),
  suggestedCategoryName: z
    .string()
    .optional()
    .describe(
      'A suggested new category name if the user-assigned category indicates a need for one.'
    ),
  reasoning: z
    .string()
    .describe('An explanation for the suggested mapping rule or new category.'),
  confidenceScore: z
umber().describe(
    'A confidence score (0-1) for the suggestion, where 1 is highly confident.'
  ),
});

export type AutomateCategoryMappingImprovementOutput = z.infer<
  typeof AutomateCategoryMappingImprovementOutputSchema
>;

export async function automateCategoryMappingImprovement(
  input: AutomateCategoryMappingImprovementInput
): Promise<AutomateCategoryMappingImprovementOutput> {
  return automateCategoryMappingImprovementFlow(input);
}

const automateCategoryMappingPrompt = ai.definePrompt({
  name: 'automateCategoryMappingPrompt',
  input: { schema: AutomateCategoryMappingImprovementInputSchema },
  output: { schema: AutomateCategoryMappingImprovementOutputSchema },
  prompt: `You are an expert expense categorization system designer. Your task is to analyze user feedback on expense categorizations to suggest improvements to the existing category mapping rules or propose new categories.

Current Expense Description: {{{expenseDescription}}}
User Assigned Category: {{{userAssignedCategory}}}
{{#if predictedCategory}}
Previous System Prediction: {{{predictedCategory}}}
{{/if}}

{{#if currentCategoryMappingExamples}}
Existing Category Mapping Examples (for reference, in a simplified text format):
{{{currentCategoryMappingExamples}}}
{{/if}}

Based on the user's input, propose a refined mapping rule or a new category that would lead to more accurate categorizations in the future. Focus on creating rules that capture the essence of the user's choice given the description. If a new category is needed, suggest a concise name. Provide a clear reasoning for your suggestion and a confidence score for your recommendation.

Format your output as a JSON object matching the schema. Your response must be valid JSON.`,
});

const automateCategoryMappingImprovementFlow = ai.defineFlow(
  {
    name: 'automateCategoryMappingImprovementFlow',
    inputSchema: AutomateCategoryMappingImprovementInputSchema,
    outputSchema: AutomateCategoryMappingImprovementOutputSchema,
  },
  async (input) => {
    const { output } = await automateCategoryMappingPrompt(input);
    if (!output) {
      throw new Error('Failed to generate category mapping improvement output.');
    }
    return output;
  }
);
