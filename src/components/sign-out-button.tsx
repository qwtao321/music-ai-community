"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    try {
      const { signOutCloudBase } = await import("@/lib/cloudbase/client");
      await signOutCloudBase();
    } catch {}

    await fetch("/api/auth/session", {
      method: "DELETE",
    });

    setIsPending(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={signOut}
      disabled={isPending}
    >
      <LogOut className="size-4" />
      <span>{isPending ? "退出中" : "退出"}</span>
    </Button>
  );
}
