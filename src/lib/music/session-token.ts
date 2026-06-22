export function resolveSessionToken(userId: string, accessToken?: string) {
  const normalizedAccessToken = accessToken?.trim();

  if (normalizedAccessToken) {
    return normalizedAccessToken;
  }

  return `cloudbase-${userId}`;
}
