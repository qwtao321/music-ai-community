"use client";

import cloudbase from "@cloudbase/js-sdk";

const env = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
const region = process.env.NEXT_PUBLIC_CLOUDBASE_REGION ?? "ap-shanghai";

let app: ReturnType<typeof cloudbase.init> | null = null;

type CloudBaseAuth = ReturnType<typeof getCloudBaseClient> extends {
  auth: (...args: never[]) => infer T;
}
  ? T
  : never;

type CloudBaseLoginState = Awaited<ReturnType<CloudBaseAuth["getLoginState"]>>;
type CloudBaseVerificationInfo = {
  verification_id: string;
  is_user: boolean;
};

export function getCloudBaseClient() {
  if (!env) {
    throw new Error("NEXT_PUBLIC_CLOUDBASE_ENV_ID is required");
  }

  if (!app) {
    app = cloudbase.init({
      env,
      region,
    });
  }

  return app;
}

export function getCloudBaseAuth() {
  return getCloudBaseClient().auth({
    persistence: "local",
  });
}

export async function getLoginState() {
  return getCloudBaseAuth().getLoginState();
}

export async function getAccessToken() {
  return getCloudBaseAuth().getAccessToken();
}

export async function sendSmsVerification(phoneNumber: string) {
  const auth = getCloudBaseAuth() as ReturnType<typeof getCloudBaseAuth> & {
    getVerification: (params: {
      phone_number: string;
    }) => Promise<CloudBaseVerificationInfo>;
  };

  const verificationInfo = await auth.getVerification({
    phone_number: phoneNumber,
  });

  if (!verificationInfo?.verification_id) {
    throw new Error("未获取到有效的短信验证码会话");
  }

  return {
    verification_id: verificationInfo.verification_id,
    is_user: Boolean(verificationInfo.is_user),
  };
}

export async function signInWithSmsCode(
  phoneNumber: string,
  verificationInfo: CloudBaseVerificationInfo,
  verificationCode: string,
) {
  const auth = getCloudBaseAuth() as ReturnType<typeof getCloudBaseAuth> & {
    signInWithSms: (params: {
      verificationInfo: CloudBaseVerificationInfo;
      verificationCode: string;
      phoneNum: string;
    }) => Promise<CloudBaseLoginState>;
  };

  return auth.signInWithSms({
    verificationInfo,
    verificationCode,
    phoneNum: phoneNumber,
  });
}

export async function signInAnonymously() {
  const auth = getCloudBaseAuth();
  const state = await auth.getLoginState();

  if (state) {
    return state;
  }

  await auth.anonymousAuthProvider().signIn();
  return auth.getLoginState();
}

export async function signInWithWeixinRedirect() {
  const appId = process.env.NEXT_PUBLIC_WECHAT_WEB_APP_ID;

  if (!appId) {
    throw new Error("NEXT_PUBLIC_WECHAT_WEB_APP_ID is required");
  }

  const auth = getCloudBaseAuth() as ReturnType<typeof getCloudBaseAuth> & {
    weixinAuthProvider: (options: {
      appid: string;
      scope?: string;
    }) => {
      signInWithRedirect: () => Promise<unknown> | unknown;
    };
  };

  return auth.weixinAuthProvider({
    appid: appId,
    scope: process.env.NEXT_PUBLIC_WECHAT_WEB_SCOPE ?? "snsapi_login",
  }).signInWithRedirect();
}

export async function getWeixinRedirectResult() {
  const appId = process.env.NEXT_PUBLIC_WECHAT_WEB_APP_ID;

  if (!appId) {
    return null;
  }

  const auth = getCloudBaseAuth() as ReturnType<typeof getCloudBaseAuth> & {
    weixinAuthProvider: (options: {
      appid: string;
      scope?: string;
    }) => {
      getRedirectResult?: () => Promise<CloudBaseLoginState | null>;
    };
  };
  const provider = auth.weixinAuthProvider({
    appid: appId,
    scope: process.env.NEXT_PUBLIC_WECHAT_WEB_SCOPE ?? "snsapi_login",
  });

  if (typeof provider.getRedirectResult === "function") {
    return provider.getRedirectResult();
  }

  return auth.getLoginState();
}

export async function signOutCloudBase() {
  const auth = getCloudBaseAuth() as ReturnType<typeof getCloudBaseAuth> & {
    signOut?: () => Promise<unknown>;
  };

  if (typeof auth.signOut === "function") {
    await auth.signOut();
  }
}

function getUserIdentity(loginState: CloudBaseLoginState | null) {
  const user = (loginState as { user?: Record<string, unknown> } | null)?.user;

  if (!user) {
    return null;
  }

  return {
    userId:
      (typeof user.uid === "string" && user.uid) ||
      (typeof user.customUserId === "string" && user.customUserId) ||
      "",
    displayName:
      (typeof user.displayName === "string" && user.displayName) ||
      (typeof user.username === "string" && user.username) ||
      (typeof user.name === "string" && user.name) ||
      undefined,
    avatarUrl:
      (typeof user.avatarUrl === "string" && user.avatarUrl) || undefined,
    phone:
      (typeof user.phoneNumber === "string" && user.phoneNumber) ||
      (typeof user.phone === "string" && user.phone) ||
      undefined,
  };
}

export async function syncCloudBaseSession(loginState?: CloudBaseLoginState | null) {
  const state = loginState ?? (await getLoginState());
  const identity = getUserIdentity(state);

  if (!identity?.userId) {
    return null;
  }

  const accessToken = await getAccessToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: identity.userId,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl ?? "",
      phone: identity.phone,
      accessToken: accessToken.accessToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to sync CloudBase session");
  }

  return (await response.json()) as {
    changed?: boolean;
  };
}
