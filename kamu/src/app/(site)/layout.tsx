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
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200/70 px-6 py-8 text-center text-sm text-slate-500">
        <p className="font-serif text-base text-slate-700">
          Kamu: food that fits your mood.
        </p>
        <p className="mt-1">Made with love in Sri Lanka.</p>
      </footer>
    </>
  );
}
