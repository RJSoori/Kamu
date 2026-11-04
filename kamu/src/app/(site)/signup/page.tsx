import { safeRedirectPath } from "@/lib/safe-redirect";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/");

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
      <SignupForm next={next} />
    </div>
  );
}
