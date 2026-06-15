import { describe, expect, it } from "vitest";
import { createDemoMusicStore } from "./store";
import {
  canReadJob,
  canReadTrack,
  requireAdminProfile,
  requireUserProfile,
} from "./auth";

describe("music auth", () => {
  it("allows admin users to manage protected resources", async () => {
    const store = createDemoMusicStore();
    const request = new Request("https://example.test", {
      headers: { "x-demo-user-id": "demo-admin" },
    });

    await expect(requireAdminProfile(store, request)).resolves.toMatchObject({
      id: "demo-admin",
      role: "admin",
    });
  });

  it("rejects normal users from admin operations", async () => {
    const store = createDemoMusicStore();
    const request = new Request("https://example.test", {
      headers: { "x-demo-user-id": "demo-user" },
    });

    await expect(requireAdminProfile(store, request)).rejects.toMatchObject({
      status: 403,
      message: "Admin permission required",
    });
  });

  it("rejects unauthenticated requests for protected resources", async () => {
    const store = createDemoMusicStore();
    const request = new Request("https://example.test");

    await expect(requireUserProfile(store, request)).rejects.toMatchObject({
      status: 401,
      message: "Login required",
    });
  });

  it("allows public tracks but restricts private tracks and jobs to owners or admins", () => {
    const publicTrack = {
      id: "track-public",
      ownerId: "owner-1",
      visibility: "public" as const,
    };
    const draftTrack = {
      id: "track-draft",
      ownerId: "owner-1",
      visibility: "draft" as const,
    };
    const hiddenTrack = {
      id: "track-hidden",
      ownerId: "owner-1",
      visibility: "hidden" as const,
    };
    const job = {
      id: "job-1",
      ownerId: "owner-1",
    };

    expect(canReadTrack(publicTrack, undefined, false)).toBe(true);
    expect(canReadTrack(draftTrack, "owner-1", false)).toBe(true);
    expect(canReadTrack(draftTrack, "viewer-2", false)).toBe(false);
    expect(canReadTrack(hiddenTrack, "admin-1", true)).toBe(true);
    expect(canReadJob(job, "owner-1", false)).toBe(true);
    expect(canReadJob(job, "viewer-2", false)).toBe(false);
    expect(canReadJob(job, "admin-1", true)).toBe(true);
  });
});
