import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/login-panel";
import { getRequestUserId } from "@/lib/music/user";

type PageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const userId = await getRequestUserId();
  const params = await searchParams;

  if (userId) {
    redirect(params.from ?? "/music");
  }

  return <LoginPanel from={params.from} />;
}
