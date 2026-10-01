import { SiteHeader } from "@/components/site/SiteHeader";

/**
 * Wraps every customer-facing page (home, restaurant detail, login, signup)
 * with the shared header. Deliberately scoped to this route group rather
 * than the root layout -- /admin has its own AdminNav and would otherwise
 * end up with both, plus customer login/logout links inside the admin panel.
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
