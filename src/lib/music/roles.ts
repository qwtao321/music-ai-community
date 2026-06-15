export type MusicRolesRuntimeEnv = Partial<{
  MUSIC_ADMIN_USER_IDS: string;
}>;

export function getAdminUserIds(
  env: MusicRolesRuntimeEnv = process.env as MusicRolesRuntimeEnv,
) {
  return new Set(
    String(env.MUSIC_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isAdminUserId(
  userId: string,
  env: MusicRolesRuntimeEnv = process.env as MusicRolesRuntimeEnv,
) {
  if (userId === "demo-admin") {
    return true;
  }

  return getAdminUserIds(env).has(userId);
}
