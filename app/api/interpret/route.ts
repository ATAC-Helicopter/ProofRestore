import { NextResponse } from "next/server";
import { z } from "zod";
import { interpretWithoutModel } from "@/app/interpret/fallback";
import { interpretWithModel } from "@/app/interpret/model";

const requestSchema = z.object({
  query: z.string().min(1).max(1_000),
  pathCandidates: z.array(z.string().min(1).max(1_024)).max(100),
  referenceDateTime: z.string().datetime(),
});

const MAX_REQUEST_BYTES = 64 * 1024;

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Request body is too large" },
        { status: 413 },
      );
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Request body is too large" },
        { status: 413 },
      );
    }
    const input = requestSchema.parse(JSON.parse(body) as unknown);
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.ENABLE_OPENAI_INTERPRETER !== "true"
    ) {
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
