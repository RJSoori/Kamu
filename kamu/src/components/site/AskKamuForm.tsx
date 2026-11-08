/**
 * The site's one search box: Ask Kamu (home hero and /ask). Takes anything
 * from a mood ("quiet café") to a plan ("lunch in Kandy, then dessert").
 * Plain GET form, no client JS: submitting navigates to /ask?q=..., which
 * runs the search and the agent server-side.
 */
export function AskKamuForm({
  defaultValue,
  autoFocus,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <form
      action="/ask"
      className="rounded-[2rem] border border-slate-200 bg-white/90 p-2 shadow-lg shadow-slate-900/5 transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200/70"
    >
      <div className="flex items-center gap-2">
        <SparkleIcon className="ml-3 h-5 w-5 shrink-0 text-cinnamon-600" />
        <input
          type="text"
          name="q"
          // Same cap as the ask-kamu Edge Function.
          maxLength={500}
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="e.g. cosy café for a rainy afternoon"
          aria-label="Ask Kamu: a mood, a craving or a plan"
          required
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Ask
        </button>
      </div>
    </form>
  );
}

export function SparkleIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2l1.8 5.5L19 9.3l-5.2 1.8L12 16.5l-1.8-5.4L5 9.3l5.2-1.8L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z"
      />
    </svg>
  );
}
