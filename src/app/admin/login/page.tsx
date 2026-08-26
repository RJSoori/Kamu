import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/admin") ? params.next : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <LoginForm next={next} />
    </div>
  );
}
