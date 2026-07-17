import { NextResponse } from "next/server";
import { z } from "zod";
import { interpretWithoutModel } from "@/app/interpret/fallback";
import { interpretWithModel } from "@/app/interpret/model";

const requestSchema = z.object({
  query: z.string().min(1).max(1_000),
  pathCandidates: z.array(z.string().min(1).max(1_024)).max(100),
  referenceDateTime: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        result: interpretWithoutModel(input),
        interpreter: "deterministic_fallback",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      return NextResponse.json({
        result: await interpretWithModel(input, controller.signal),
        interpreter: "openai",
      });
    } catch {
      return NextResponse.json({
        result: interpretWithoutModel(input),
        interpreter: "deterministic_fallback",
        warning: "Model interpretation was unavailable; safe fallback used.",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
