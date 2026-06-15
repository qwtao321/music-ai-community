import { cookies, headers } from "next/headers";
import {
  cloudBaseLegacyUserCookieName,
  cloudBaseUserCookieName,
} from "./user-id";

export async function getRequestUserId() {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  return (
    headerStore.get("x-demo-user-id") ??
    cookieStore.get(cloudBaseUserCookieName)?.value ??
    cookieStore.get(cloudBaseLegacyUserCookieName)?.value
  );
}
