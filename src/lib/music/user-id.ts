export const cloudBaseLegacyUserCookieName = "cloudbase_anonymous_user_id";
export const cloudBaseUserCookieName = "cloudbase_uid";
export const cloudBaseSessionCookieName = "cloudbase_session";

export function getUserIdFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return undefined;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  const cookie =
    parts.find((part) => part.startsWith(`${cloudBaseUserCookieName}=`)) ??
    parts.find((part) => part.startsWith(`${cloudBaseLegacyUserCookieName}=`));

  if (!cookie) {
    return undefined;
  }

  const [name] = cookie.split("=");
  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function hasSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => part.startsWith(`${cloudBaseSessionCookieName}=`));
}
