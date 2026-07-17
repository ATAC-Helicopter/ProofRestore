import { z } from "zod";

export const interpretedRecoveryRequestSchema = z.object({
  intent: z.enum([
    "recover_path",
    "find_unrecoverable",
    "show_conflicts",
    "inspect_history",
  ]),
  pathQuery: z.string().optional(),
  resolvedPath: z.string().optional(),
  requestedDateTime: z.string().datetime().optional(),
  dateInterpretation: z.string().optional(),
  includeChildren: z.boolean(),
  destinationMode: z.enum(["safe_copy", "original_location"]),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().optional(),
});

export type InterpretedRecoveryRequest = z.infer<
  typeof interpretedRecoveryRequestSchema
>;

export type InterpretInput = {
  query: string;
  pathCandidates: string[];
  referenceDateTime: string;
};
