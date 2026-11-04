/**
 * The mood search box (home hero and /search). Plain GET form, no client
 * JS: submitting navigates to /search?q=..., which runs the search
 * server-side. `children` adds extra fields (the /search filters).
 */
export function MoodSearchForm({
  defaultValue,
  autoFocus,
  children,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <form
      action="/search"
      className="rounded-[2rem] border border-slate-200 bg-white/90 p-2 shadow-lg shadow-slate-900/5 transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200/70"
    >
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="ml-3 h-5 w-5 shrink-0 text-slate-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          name="q"
          // Same cap as the mood-search Edge Function.
          maxLength={300}
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="e.g. cosy café for a rainy afternoon"
          aria-label="What are you in the mood for?"
          required
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Search
        </button>
      </div>
      {children}
    </form>
  );
}
