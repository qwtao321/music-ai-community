import { describe, expect, it } from "vitest";
import {
  applyCreditChange,
  calculateGenerationCost,
  createCreditAccount,
} from "./credits";

describe("credit accounting", () => {
  it("charges more credits for audio cover jobs than original jobs", () => {
    expect(calculateGenerationCost("original")).toBe(10);
    expect(calculateGenerationCost("cover_text_style")).toBe(12);
    expect(calculateGenerationCost("cover_audio")).toBe(18);
  });

  it("deducts credits and prevents overspending", () => {
    const account = createCreditAccount("user-1", 20);
    const charged = applyCreditChange(account, {
      amount: -18,
      reason: "generation_charge",
      jobId: "job-1",
    });

    expect(charged.balance).toBe(2);
    expect(charged.ledger).toHaveLength(1);
    expect(() =>
      applyCreditChange(charged, {
        amount: -10,
        reason: "generation_charge",
        jobId: "job-2",
      }),
    ).toThrow("Insufficient credits");
  });

  it("refunds failed jobs without losing prior ledger entries", () => {
    const account = createCreditAccount("user-1", 20);
    const charged = applyCreditChange(account, {
      amount: -10,
      reason: "generation_charge",
      jobId: "job-1",
    });
    const refunded = applyCreditChange(charged, {
      amount: 10,
      reason: "generation_refund",
      jobId: "job-1",
    });

    expect(refunded.balance).toBe(20);
    expect(refunded.ledger.map((entry) => entry.reason)).toEqual([
      "generation_charge",
      "generation_refund",
    ]);
  });
});
