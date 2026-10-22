import { SiteHeader } from "@/components/site/SiteHeader";

/**
 * Wraps every customer-facing page (home, restaurant detail, login, signup)
 * with the shared header. Scoped to this route group rather than the root
 * layout so non-page routes like /auth/callback stay header-free.
 */
export default function SiteLayout({
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
