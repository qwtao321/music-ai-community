import { describe, expect, it } from "vitest";
import { getAdminUserIds, isAdminUserId } from "./roles";

describe("music roles", () => {
  it("parses admin ids from environment variables", () => {
    expect(
      getAdminUserIds({
        MUSIC_ADMIN_USER_IDS: "wx-1, wx-2 ,demo-admin",
      }),
    ).toEqual(new Set(["wx-1", "wx-2", "demo-admin"]));
  });

  it("treats configured ids as admins", () => {
    expect(
      isAdminUserId("wx-admin", {
        MUSIC_ADMIN_USER_IDS: "wx-admin",
      }),
    ).toBe(true);

    expect(
      isAdminUserId("wx-user", {
        MUSIC_ADMIN_USER_IDS: "wx-admin",
      }),
    ).toBe(false);
  });
});
