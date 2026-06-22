import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("prefers the message field from plain thrown objects", () => {
    expect(getErrorMessage({ message: "短信能力未开通" }, "验证码发送失败")).toBe(
      "短信能力未开通",
    );
  });

  it("falls back to the provided message when the thrown value is not readable", () => {
    expect(getErrorMessage({ code: "unknown" }, "验证码发送失败")).toBe("验证码发送失败");
  });

  it("surfaces nested provider error details when top-level fields are empty", () => {
    expect(
      getErrorMessage(
        {
          error: {
            code: "permission_denied",
            message:
              "cors permission denied, please check if music.thesolve.cloud is in domains",
          },
        },
        "验证码发送失败",
      ),
    ).toContain("permission_denied");
  });
});
