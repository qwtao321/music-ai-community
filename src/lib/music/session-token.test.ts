import { describe, expect, it } from "vitest";
import { resolveSessionToken } from "./session-token";

describe("resolveSessionToken", () => {
  it("prefers a non-empty CloudBase access token", () => {
    expect(resolveSessionToken("user-1", "token-1")).toBe("token-1");
  });

  it("falls back to a stable user-scoped token when access token is missing", () => {
    expect(resolveSessionToken("user-1", "")).toBe("cloudbase-user-1");
    expect(resolveSessionToken("user-1", undefined)).toBe("cloudbase-user-1");
  });
});
