/**
 * Hide/unhide for one restaurant or menu item. The actions come pre-bound
 * with the target's id; hiding asks for the note the owner will see.
 */
export function HideControl({
  hidden,
  hideAction,
  unhideAction,
}: {
  hidden: boolean;
  hideAction: (formData: FormData) => Promise<void>;
  unhideAction: (formData: FormData) => Promise<void>;
}) {
  if (hidden) {
    return (
      <form action={unhideAction}>
        <button
          type="submit"
          className="font-medium text-slate-700 hover:text-slate-900"
        >
          Unhide
        </button>
      </form>
    );
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer font-medium text-rose-600 hover:text-rose-700">
        Hide
      </summary>
      <form
        action={hideAction}
        className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
      >
        <label className="block text-xs font-medium text-slate-700">
          Note for the owner
          <textarea
            name="moderation_note"
            required
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Hide from customers
        </button>
      </form>
    </details>
  );
}

export function HiddenBadge() {
  return (
    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
      Hidden
    </span>
  );
}
