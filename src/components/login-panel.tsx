"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircleMore, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginPanel({ from = "/music" }: { from?: string }) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationInfo, setVerificationInfo] = useState<{
    verification_id: string;
    is_user: boolean;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState("");
  const isConfigured = Boolean(process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  function normalizePhone(input: string) {
    return input.replace(/\D/g, "").slice(0, 11);
  }

  async function sendCode() {
    if (!isConfigured || phoneNumber.length !== 11 || countdown > 0) {
      return;
    }

    setIsSending(true);
    setMessage("");

    try {
      const { sendSmsVerification } = await import("@/lib/cloudbase/client");
      const nextVerificationInfo = await sendSmsVerification(phoneNumber);
      setVerificationInfo(nextVerificationInfo);
      setCountdown(60);
      setMessage("验证码已发送，请留意手机短信。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证码发送失败");
    } finally {
      setIsSending(false);
    }
  }

  async function signIn() {
    if (!isConfigured || !verificationInfo || verificationCode.trim().length < 4) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const { signInWithSmsCode, syncCloudBaseSession } = await import(
        "@/lib/cloudbase/client"
      );
      const loginState = await signInWithSmsCode(
        phoneNumber,
        verificationInfo,
        verificationCode.trim(),
      );
      await syncCloudBaseSession(loginState);
      router.replace(from);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-10 sm:px-6">
      <section className="rounded border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-black/55">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">手机号登录</h1>
        <p className="mt-3 text-sm leading-6 text-black/65">
          登录后会自动创建账号档案，解锁创作、草稿、收藏、个人中心和管理权限校验。
        </p>
        <div className="mt-6 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/65">手机号</span>
            <div className="flex items-center gap-2 rounded border border-black/15 px-3 py-2">
              <Smartphone className="size-4 text-black/45" />
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(normalizePhone(event.target.value))}
                inputMode="numeric"
                placeholder="请输入 11 位手机号"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/65">验证码</span>
            <div className="flex gap-2">
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="请输入短信验证码"
                className="h-11 min-w-0 flex-1 rounded border border-black/15 px-3 text-sm outline-none"
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendCode}
                disabled={!isConfigured || phoneNumber.length !== 11 || isSending || countdown > 0}
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageCircleMore className="size-4" />
                )}
                <span>{countdown > 0 ? `${countdown}s` : "获取验证码"}</span>
              </Button>
            </div>
          </label>
          <Button
            type="button"
            className="w-full"
            onClick={signIn}
            disabled={!isConfigured || !verificationInfo || verificationCode.trim().length < 4 || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
            <span>{isSubmitting ? "登录中" : "使用手机号登录"}</span>
          </Button>
          {message && (
            <p className="rounded bg-[#eef2f1] px-3 py-2 text-sm text-black/70">
              {message}
            </p>
          )}
          {!isConfigured && (
            <p className="rounded bg-[#fff4e8] px-3 py-2 text-sm text-[#9a4d07]">
              需要先配置 `NEXT_PUBLIC_CLOUDBASE_ENV_ID`。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
