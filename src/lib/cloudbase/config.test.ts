import { describe, expect, it } from "vitest";
import { getCloudBaseConfig, shouldUseCloudBaseStore } from "./config";

describe("cloudbase config", () => {
  it("uses CloudBase only when env id and Tencent credentials are present", () => {
    expect(
      shouldUseCloudBaseStore({
        CLOUDBASE_ENV_ID: "env-1",
        TENCENTCLOUD_SECRET_ID: "sid",
        TENCENTCLOUD_SECRET_KEY: "skey",
      }),
    ).toBe(true);

    expect(
      shouldUseCloudBaseStore({
        CLOUDBASE_ENV_ID: "env-1",
      }),
    ).toBe(false);
  });

  it("builds a stable CloudBase runtime config", () => {
    expect(
      getCloudBaseConfig({
        CLOUDBASE_ENV_ID: "oscar-d1gv01qxw0d7f0ec4",
        CLOUDBASE_REGION: "ap-shanghai",
        TENCENTCLOUD_SECRET_ID: "sid",
        TENCENTCLOUD_SECRET_KEY: "skey",
      }),
    ).toEqual({
      env: "oscar-d1gv01qxw0d7f0ec4",
      region: "ap-shanghai",
      secretId: "sid",
      secretKey: "skey",
    });
  });
});
