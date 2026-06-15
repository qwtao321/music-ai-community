import { describe, expect, it } from "vitest";
import { generationSchema, getUserIdFromRequest } from "./api";

describe("generation schema", () => {
  it("accepts prompts up to 5000 characters", () => {
    const prompt = "灵感".repeat(2500);

    expect(() =>
      generationSchema.parse({
        mode: "original",
        prompt,
      }),
    ).not.toThrow();
  });

  it("rejects prompts over 5000 characters", () => {
    const prompt = `${"灵感".repeat(2500)}x`;

    expect(() =>
      generationSchema.parse({
        mode: "original",
        prompt,
      }),
    ).toThrow();
  });

  it("uses the CloudBase anonymous user cookie when no explicit user header exists", () => {
    const request = new Request("https://example.test", {
      headers: {
        cookie: "cloudbase_anonymous_user_id=anon-123",
      },
    });

    expect(getUserIdFromRequest(request)).toBe("anon-123");
  });

  it("returns undefined when the request does not carry any login identity", () => {
    const request = new Request("https://example.test");

    expect(getUserIdFromRequest(request)).toBeUndefined();
  });
});
