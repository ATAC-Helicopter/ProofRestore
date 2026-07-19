import OpenAI from "openai";
import { interpretedRecoveryRequestSchema, type InterpretInput } from "./types";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "string",
      enum: [
        "recover_path",
        "find_unrecoverable",
        "show_conflicts",
        "inspect_history",
      ],
    },
    pathQuery: { type: "string" },
    resolvedPath: { type: "string" },
    requestedDateTime: { type: "string" },
    dateInterpretation: { type: "string" },
    includeChildren: { type: "boolean" },
    destinationMode: {
      type: "string",
      enum: ["safe_copy", "original_location"],
    },
    needsClarification: { type: "boolean" },
    clarificationQuestion: { type: "string" },
  },
  required: [
    "intent",
    "pathQuery",
    "resolvedPath",
    "requestedDateTime",
    "dateInterpretation",
    "includeChildren",
    "destinationMode",
    "needsClarification",
    "clarificationQuestion",
  ],
} as const;

export async function interpretWithModel(
  input: InterpretInput,
  signal: AbortSignal,
) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create(
    {
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      instructions:
        "Interpret recovery intent only. Never decide existence, integrity, safety, or recoverability. resolvedPath must be one exact supplied candidate or an empty string. Preserve ambiguity and use UTC ISO 8601 timestamps.",
      input: JSON.stringify({
        query: input.query,
        referenceDateTime: input.referenceDateTime,
        pathCandidates: input.pathCandidates.slice(0, 100),
      }),
      text: {
        format: {
          type: "json_schema",
          name: "recovery_request",
          strict: true,
          schema: responseSchema,
        },
      },
    },
    { signal },
  );

  const parsed = interpretedRecoveryRequestSchema.parse(
    JSON.parse(response.output_text),
  );
  if (
    parsed.resolvedPath &&
    !input.pathCandidates.includes(parsed.resolvedPath)
  ) {
    throw new Error(
      "Interpreter returned a path outside the supplied candidates",
    );
  }
  return parsed;
}
