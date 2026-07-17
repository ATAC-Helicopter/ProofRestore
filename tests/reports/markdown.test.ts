import { describe, expect, it } from "vitest";
import { demoVault } from "@/app/demo";
import { planRecovery } from "@/app/recovery";
import { generateProofReport } from "@/app/reports/markdown";

describe("Proof of Recoverability report", () => {
  it("renders required deterministic sections and escapes imported markdown", () => {
    const plan = planRecovery(demoVault, {
      path: "Documents/University/Thesis-Final.docx",
      requestedAt: "2026-07-14T20:00:00.000Z",
      destinationMode: "original_location",
    });
    const report = generateProofReport({
      manifest: { ...demoVault, vaultName: "Vault <script>*unsafe*</script>" },
      plan,
      originalRequest: "Can I recover my thesis from Tuesday evening?",
      generatedAt: "2026-07-18T12:00:00.000Z",
    });

    expect(report).toContain("# Proof of Recoverability");
    expect(report).toContain("## Evidence appendix");
    expect(report).toContain("Simulation only");
    expect(report).toContain("fully_recoverable");
    expect(report).not.toContain("<script>");
  });
});
