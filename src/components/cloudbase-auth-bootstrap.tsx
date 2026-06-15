"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CloudBaseAuthBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) {
      return;
    }

    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    void import("@/lib/cloudbase/client")
      .then(async ({ getLoginState, getWeixinRedirectResult, syncCloudBaseSession }) => {
        const redirectState =
          pathname === "/login"
            ? await getWeixinRedirectResult()
            : null;
        const loginState = redirectState ?? (await getLoginState());

        if (!loginState?.user) {
          return null;
        }

        const payload = await syncCloudBaseSession(loginState);

        if (pathname === "/login") {
          router.replace(params.get("from") ?? "/music");
          return null;
        }

        if (payload?.changed) {
          router.refresh();
        }

        return null;
      });
  }, [router]);

  return null;
}
