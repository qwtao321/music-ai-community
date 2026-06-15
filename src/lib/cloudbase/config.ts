export type CloudBaseRuntimeEnv = Partial<{
  CLOUDBASE_ENV_ID: string;
  CLOUDBASE_REGION: string;
  TENCENTCLOUD_SECRET_ID: string;
  TENCENTCLOUD_SECRET_KEY: string;
  CLOUDBASE_FORCE_DEMO: string;
}>;

export type CloudBaseConfig = {
  env: string;
  region: string;
  secretId?: string;
  secretKey?: string;
};

export function getCloudBaseConfig(
  env: CloudBaseRuntimeEnv = process.env as CloudBaseRuntimeEnv,
): CloudBaseConfig {
  return {
    env: env.CLOUDBASE_ENV_ID ?? "",
    region: env.CLOUDBASE_REGION ?? "ap-shanghai",
    secretId: env.TENCENTCLOUD_SECRET_ID,
    secretKey: env.TENCENTCLOUD_SECRET_KEY,
  };
}

export function shouldUseCloudBaseStore(
  env: CloudBaseRuntimeEnv = process.env as CloudBaseRuntimeEnv,
) {
  if (env.CLOUDBASE_FORCE_DEMO === "true") {
    return false;
  }

  return Boolean(
    env.CLOUDBASE_ENV_ID &&
      env.TENCENTCLOUD_SECRET_ID &&
      env.TENCENTCLOUD_SECRET_KEY,
  );
}
