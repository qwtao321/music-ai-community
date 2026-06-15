import Link from "next/link";
import { Disc3, Music2, Trophy, UserRound, Wrench } from "lucide-react";
import { getMusicStore } from "@/lib/music/server-store";
import { getRequestUserId } from "@/lib/music/user";
import { SignOutButton } from "./sign-out-button";

const publicNavItems = [
  { href: "/music", label: "创作", icon: Music2 },
  { href: "/music/hall", label: "广场", icon: Disc3 },
  { href: "/music/rankings", label: "榜单", icon: Trophy },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const userId = await getRequestUserId();
  const store = await getMusicStore();
  const profile = userId ? await store.ensureProfile(userId) : null;
  const navItems = [
    ...publicNavItems,
    ...(profile ? [{ href: "/me", label: "我的", icon: UserRound }] : []),
    ...(profile?.role === "admin"
      ? [{ href: "/admin", label: "管理", icon: Wrench }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#eef2f1] text-[#191713]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#eef2f1]/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/music" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded bg-[#191713] text-[#eef2f1]">
              <Disc3 className="size-5" />
            </span>
            <span>AI 音乐社区</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-9 items-center gap-1.5 rounded px-2.5 text-sm font-medium text-black/65 transition hover:bg-black/8 hover:text-black"
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{profile.displayName}</p>
                  <p className="text-xs text-black/50">
                    {profile.role === "admin" ? "管理员" : "微信已登录"}
                  </p>
                </div>
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="rounded bg-[#191713] px-3 py-2 text-sm font-semibold text-white"
              >
                微信登录
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
