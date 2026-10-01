import { SiteHeader } from "@/components/marketing/SiteHeader";

/**
 * Wraps the public marketing/auth pages (home, login, register) with the
 * shared header. Scoped to this route group rather than the root layout,
 * same reasoning as kamu/src/app/(site)/layout.tsx: /dashboard has its own
 * DashboardNav and would otherwise end up with both.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
