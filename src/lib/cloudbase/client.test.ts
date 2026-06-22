import { describe, expect, it } from "vitest";
import { getAccessTokenValue } from "./client";

describe("cloudbase client helpers", () => {
  it("reads accessToken from the SDK object shape", () => {
    expect(getAccessTokenValue({ accessToken: "token-1" })).toBe("token-1");
  });

  it("falls back to token-like fields when accessToken is absent", () => {
    expect(getAccessTokenValue({ token: "token-2" })).toBe("token-2");
    expect(getAccessTokenValue({ access_token: "token-3" })).toBe("token-3");
  });

  it("returns an empty string when no token value is available", () => {
    expect(getAccessTokenValue({})).toBe("");
    expect(getAccessTokenValue(null)).toBe("");
  });
});
