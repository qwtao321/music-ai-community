import cloudbase from "@cloudbase/node-sdk";
import { getCloudBaseConfig } from "./config";

const globalForCloudBase = globalThis as unknown as {
  cloudBaseApp?: ReturnType<typeof cloudbase.init>;
};

export function getCloudBaseApp() {
  if (!globalForCloudBase.cloudBaseApp) {
    const config = getCloudBaseConfig();

    if (!config.env) {
      throw new Error("CLOUDBASE_ENV_ID is required");
    }

    globalForCloudBase.cloudBaseApp = cloudbase.init({
      env: config.env,
      region: config.region,
      secretId: config.secretId,
      secretKey: config.secretKey,
    });
  }

  return globalForCloudBase.cloudBaseApp;
}

export function getCloudBaseDb() {
  return getCloudBaseApp().database();
}
