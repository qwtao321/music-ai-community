"use client";

import { FormEvent, useState } from "react";
import { BadgePlus, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminPanel() {
  const [message, setMessage] = useState("");

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/credits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId: data.get("profileId"),
        amount: Number(data.get("amount")),
      }),
    });
    setMessage(response.ok ? "积分已发放" : "积分发放失败");
  }

  async function hide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/hide-track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trackId: data.get("trackId") }),
    });
    setMessage(response.ok ? "作品已隐藏" : "隐藏失败");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={grant} className="space-y-3 rounded border border-black/10 bg-white p-4">
        <div className="flex items-center gap-2 font-semibold">
          <BadgePlus className="size-4" />
          发放积分
        </div>
        <input
          name="profileId"
          placeholder="profile id"
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
        <input
          name="amount"
          type="number"
          defaultValue={50}
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
        <Button type="submit">确认发放</Button>
      </form>
      <form onSubmit={hide} className="space-y-3 rounded border border-black/10 bg-white p-4">
        <div className="flex items-center gap-2 font-semibold">
          <EyeOff className="size-4" />
          隐藏作品
        </div>
        <input
          name="trackId"
          placeholder="track id"
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
        <Button type="submit" variant="destructive">
          隐藏
        </Button>
      </form>
      {message && <p className="md:col-span-2 rounded bg-white px-3 py-2 text-sm">{message}</p>}
    </div>
  );
}
