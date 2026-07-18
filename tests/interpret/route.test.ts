import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/interpret/route";

const validBody = {
  query: "Can I recover my thesis from Tuesday evening?",
  pathCandidates: ["Documents/University/Thesis-Final.docx"],
  referenceDateTime: "2026-07-18T10:00:00.000Z",
};

afterEach(() => {
  delete process.env.ENABLE_OPENAI_INTERPRETER;
  delete process.env.OPENAI_API_KEY;
});

describe("interpreter API boundary", () => {
  it("uses the deterministic fallback unless model use is explicitly enabled", async () => {
    process.env.OPENAI_API_KEY = [
      "test",
      "placeholder",
      "not",
      "a",
      "key",
    ].join("-");
    const response = await POST(
      new Request("http://localhost/api/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      interpreter: "deterministic_fallback",
      result: {
        resolvedPath: "Documents/University/Thesis-Final.docx",
        requestedDateTime: "2026-07-14T19:00:00.000Z",
      },
    });
  });

  it("rejects oversized request bodies before interpretation", async () => {
    const response = await POST(
      new Request("http://localhost/api/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validBody, query: "x".repeat(70_000) }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Request body is too large",
    });
  });
});
