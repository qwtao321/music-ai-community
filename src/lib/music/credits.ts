import type { CreditLedgerEntry, GenerationMode, Profile } from "./types";

export type CreditAccount = Pick<Profile, "id" | "credits"> & {
  balance: number;
  ledger: CreditLedgerEntry[];
};

type CreditChange = {
  amount: number;
  reason: CreditLedgerEntry["reason"];
  jobId?: string;
};

export function calculateGenerationCost(mode: GenerationMode) {
  if (mode === "cover_audio") {
    return 18;
  }

  if (mode === "cover_text_style") {
    return 12;
  }

  return 10;
}

export function createCreditAccount(id: string, credits = 100): CreditAccount {
  return {
    id,
    credits,
    balance: credits,
    ledger: [],
  };
}

export function applyCreditChange(
  account: CreditAccount,
  change: CreditChange,
): CreditAccount {
  const nextBalance = account.credits + change.amount;

  if (nextBalance < 0) {
    throw new Error("Insufficient credits");
  }

  return {
    ...account,
    credits: nextBalance,
    balance: nextBalance,
    ledger: [
      ...account.ledger,
      {
        id: `ledger-${account.ledger.length + 1}-${Date.now()}`,
        profileId: account.id,
        amount: change.amount,
        reason: change.reason,
        jobId: change.jobId,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
