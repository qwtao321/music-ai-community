import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { getMusicStore } from "@/lib/music/server-store";
import { getRequestUserId } from "@/lib/music/user";

export const dynamic = "force-dynamic";

const reasonLabels = {
  signup_bonus: "注册赠送",
  generation_charge: "生成扣费",
  generation_refund: "失败返还",
  admin_grant: "管理员发放",
};

export default async function AdminPage() {
  const store = await getMusicStore();
  const userId = await getRequestUserId();

  if (!userId) {
    redirect("/login?from=/admin");
  }

  const profile = await store.ensureProfile(userId);

  if (profile.role !== "admin") {
    redirect("/music");
  }

  const snapshot = await store.getAdminSnapshot();

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <section className="rounded border border-black/10 bg-white p-5">
        <p className="text-sm font-medium text-black/55">Admin</p>
        <h1 className="mt-1 text-3xl font-semibold">社区管理</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {Object.entries(snapshot.totals).map(([label, value]) => (
            <div key={label} className="rounded bg-[#eef2f1] p-3">
              <p className="text-sm text-black/55">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <AdminPanel />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-black/10 bg-white p-4">
          <h2 className="font-semibold">用户积分</h2>
          <div className="mt-3 space-y-2">
            {snapshot.profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between rounded bg-[#eef2f1] px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{profile.displayName}</p>
                  <p className="truncate text-xs text-black/50">
                    {profile.id} · {profile.role}
                  </p>
                </div>
                <span className="font-semibold">{profile.credits} 积分</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-black/10 bg-white p-4">
          <h2 className="font-semibold">最近积分流水</h2>
          <div className="mt-3 space-y-2">
            {snapshot.ledger.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded bg-[#eef2f1] px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{reasonLabels[entry.reason]}</p>
                  <p className="truncate text-xs text-black/50">
                    {entry.profileId}
                    {entry.jobId ? ` · ${entry.jobId}` : ""}
                  </p>
                </div>
                <span
                  className={
                    entry.amount > 0
                      ? "font-semibold text-[#1f7a4d]"
                      : "font-semibold text-[#b43b22]"
                  }
                >
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount}
                </span>
              </div>
            ))}
            {!snapshot.ledger.length && (
              <p className="text-sm text-black/55">暂无积分流水</p>
            )}
          </div>
        </div>
      </section>
      <section className="rounded border border-black/10 bg-white p-4">
        <h2 className="font-semibold">失败任务</h2>
        <div className="mt-3 space-y-2">
          {snapshot.failedJobs.map((job) => (
            <div key={job.id} className="rounded bg-[#eef2f1] px-3 py-2 text-sm">
              {job.prompt} · {job.error}
            </div>
          ))}
          {!snapshot.failedJobs.length && (
            <p className="text-sm text-black/55">暂无失败任务</p>
          )}
        </div>
      </section>
    </div>
  );
}
